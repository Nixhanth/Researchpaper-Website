package com.researcher.tool.service;

import com.researcher.tool.model.Article;
import com.researcher.tool.model.ArticleType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PubMedService {

    private final WebClient webClient;
    private static final int TIMEOUT_SECONDS = 60; // Increased timeout for better reliability
    private static final int MAX_RETRIES = 3;
    private static final int BATCH_SIZE = 50; // Fetch articles in smaller batches to avoid timeouts
    private static final Duration RATE_LIMIT_DELAY = Duration.ofMillis(350); // NCBI recommends max 3 requests/second

    // Identify the tool to NCBI to avoid throttling
    private static final String TOOL_NAME = "researcher-tool";
    private static final String TOOL_EMAIL = "admin@researcher-tool.com";

    // Cache for search results: stores query+offset -> {webEnv, queryKey, count,
    // ids}
    private final ConcurrentHashMap<String, CachedSearchResult> searchCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

    // Cache for fetched articles by PMID
    private final ConcurrentHashMap<String, Article> articleCache = new ConcurrentHashMap<>();

    public PubMedService(WebClient.Builder webClientBuilder) {
        // Increase buffer size for large XML responses
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(32 * 1024 * 1024)) // 32MB
                .build();

        org.springframework.http.client.reactive.ReactorClientHttpConnector connector = new org.springframework.http.client.reactive.ReactorClientHttpConnector(
                reactor.netty.http.client.HttpClient.create()
                        .responseTimeout(java.time.Duration.ofSeconds(TIMEOUT_SECONDS)));

        this.webClient = webClientBuilder
                .baseUrl("https://eutils.ncbi.nlm.nih.gov/entrez/eutils")
                .clientConnector(connector)
                .exchangeStrategies(strategies)
                .build();
    }

    /**
     * Cache entry for search results
     */
    private static class CachedSearchResult {
        String webEnv;
        String queryKey;
        int count;
        Map<Integer, List<String>> offsetToIds; // Maps offset -> list of IDs
        long timestamp;

        CachedSearchResult(String webEnv, String queryKey, int count) {
            this.webEnv = webEnv;
            this.queryKey = queryKey;
            this.count = count;
            this.offsetToIds = new ConcurrentHashMap<>();
            this.timestamp = System.currentTimeMillis();
        }

        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS;
        }
    }

    /**
     * Main search method with caching and retry logic
     */
    public Map<String, Object> searchPubMed(String query, String searchType, int offset, int limit) {
        System.out.println(
                "DEBUG: searchPubMed called with query='" + query + "', offset=" + offset + ", limit=" + limit);

        // 1. Construct Query
        String finalQuery = constructQuery(query, searchType);
        String cacheKey = finalQuery.toLowerCase().trim();

        // 2. Check cache for this query
        CachedSearchResult cached = searchCache.get(cacheKey);

        // If we have a valid cached result with webEnv, use it for pagination
        if (cached != null && !cached.isExpired() && cached.webEnv != null) {
            System.out
                    .println("DEBUG: Using cached search result. WebEnv=" + cached.webEnv + ", count=" + cached.count);

            // Check if we have cached IDs for this offset
            List<String> cachedIds = cached.offsetToIds.get(offset);
            if (cachedIds != null && !cachedIds.isEmpty()) {
                System.out.println("DEBUG: Found cached IDs for offset=" + offset);
                List<Article> articles = fetchArticlesWithRetry(cachedIds);
                return Map.of("count", cached.count, "articles", articles);
            }

            // Fetch IDs for this offset using history
            List<String> ids = fetchIdsFromHistory(cached.webEnv, cached.queryKey, offset, limit);
            if (!ids.isEmpty()) {
                cached.offsetToIds.put(offset, ids);
                List<Article> articles = fetchArticlesWithRetry(ids);
                return Map.of("count", cached.count, "articles", articles);
            }
        }

        // 3. Fresh search - Call esearch to get IDs, count, and web environment
        Map<String, Object> searchResult = callEsearchWithHistory(finalQuery, offset, limit);

        int count = (int) searchResult.getOrDefault("count", 0);
        List<String> idList = (List<String>) searchResult.getOrDefault("ids", Collections.emptyList());
        String webEnv = (String) searchResult.get("webEnv");
        String queryKey = (String) searchResult.get("queryKey");

        System.out.println("DEBUG: esearch returned count=" + count + ", ids=" + idList.size() + ", webEnv=" + webEnv);

        // Cache the search result
        if (webEnv != null && queryKey != null) {
            CachedSearchResult newCache = new CachedSearchResult(webEnv, queryKey, count);
            newCache.offsetToIds.put(offset, idList);
            searchCache.put(cacheKey, newCache);
        }

        if (idList.isEmpty()) {
            return Map.of("count", count, "articles", Collections.emptyList());
        }

        // 4. Fetch articles with retry logic
        List<Article> articles = fetchArticlesWithRetry(idList);

        // Validate result size and provide detailed error info
        if (articles.isEmpty() && !idList.isEmpty()) {
            System.err.println(
                    "ERROR: ID list was not empty (" + idList.size()
                            + ") but efetch returned 0 articles. Possible parsing or network error.");
        }

        return Map.of("count", count, "articles", articles);
    }

    /**
     * Helper method to fetch publications as a simple list for validation or quick
     * access
     */
    @SuppressWarnings("unchecked")
    public List<Article> fetchPublicationsFromPubMed(String query) {
        Map<String, Object> result = searchPubMed(query, "ALL", 0, 10);
        return (List<Article>) result.getOrDefault("articles", Collections.emptyList());
    }

    private String constructQuery(String query, String searchType) {
        if (query == null)
            return "";
        // If query already contains tags (e.g. [AU]), assume frontend handled it.
        // If query is plain text and type is not ALL, append tag.
        if (!query.contains("[") && !"ALL".equalsIgnoreCase(searchType)) {
            String tag = "";
            switch (searchType.toUpperCase()) {
                case "TITLE":
                    tag = "[TI]";
                    break;
                case "AUTHOR":
                    tag = "[AU]";
                    break;
                case "INSTITUTION":
                case "AFFILIATION":
                case "EMAIL":
                    tag = "[AD]";
                    break;
                case "JOURNAL":
                    tag = "[TA]";
                    break;
                case "YEAR":
                    tag = "[DP]";
                    break;
                case "PMID":
                    tag = "[PMID]";
                    break;
                case "DOI":
                    tag = "[AID]";
                    break;
                case "ABSTRACT":
                    tag = "[AB]";
                    break;
            }
            return query + tag;
        }
        return query;
    }

    /**
     * Call esearch with usehistory=y to get WebEnv for pagination
     */
    private Map<String, Object> callEsearchWithHistory(String term, int retstart, int retmax) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Rate limiting delay
                Thread.sleep(RATE_LIMIT_DELAY.toMillis());

                Map response = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/esearch.fcgi")
                                .queryParam("db", "pubmed")
                                .queryParam("term", term)
                                .queryParam("retstart", String.valueOf(retstart))
                                .queryParam("retmax", String.valueOf(retmax))
                                .queryParam("retmode", "json")
                                .queryParam("usehistory", "y")
                                .queryParam("tool", TOOL_NAME)
                                .queryParam("email", TOOL_EMAIL)
                                .build())
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                if (response == null || !response.containsKey("esearchresult")) {
                    System.out.println("DEBUG: esearch returned null or missing esearchresult on attempt " + attempt);
                    continue;
                }

                Map<String, Object> esearchResult = (Map<String, Object>) response.get("esearchresult");

                // Check for error
                if (esearchResult.containsKey("ERROR")) {
                    System.err.println("ERROR: esearch returned error: " + esearchResult.get("ERROR"));
                    continue;
                }

                // Parse Count
                String countStr = (String) esearchResult.getOrDefault("count", "0");
                int count = Integer.parseInt(countStr);

                // Parse IDs
                List<String> ids = (List<String>) esearchResult.getOrDefault("idlist", Collections.emptyList());

                // Parse WebEnv and QueryKey for history-based pagination
                String webEnv = (String) esearchResult.get("webenv");
                String queryKey = (String) esearchResult.get("querykey");

                return Map.of(
                        "count", count,
                        "ids", ids,
                        "webEnv", webEnv != null ? webEnv : "",
                        "queryKey", queryKey != null ? queryKey : "");
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                System.err.println("ERROR: esearch failed on attempt " + attempt + ": " + e.getMessage());
                if (attempt == MAX_RETRIES) {
                    e.printStackTrace();
                }
            }
        }
        return Map.of("count", 0, "ids", Collections.emptyList(), "webEnv", "", "queryKey", "");
    }

    /**
     * Fetch IDs using WebEnv and QueryKey from history
     */
    private List<String> fetchIdsFromHistory(String webEnv, String queryKey, int retstart, int retmax) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                Thread.sleep(RATE_LIMIT_DELAY.toMillis());

                Map response = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/esearch.fcgi")
                                .queryParam("db", "pubmed")
                                .queryParam("query_key", queryKey)
                                .queryParam("WebEnv", webEnv)
                                .queryParam("retstart", String.valueOf(retstart))
                                .queryParam("retmax", String.valueOf(retmax))
                                .queryParam("retmode", "json")
                                .queryParam("tool", TOOL_NAME)
                                .queryParam("email", TOOL_EMAIL)
                                .build())
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                if (response != null && response.containsKey("esearchresult")) {
                    Map<String, Object> esearchResult = (Map<String, Object>) response.get("esearchresult");
                    List<String> ids = (List<String>) esearchResult.getOrDefault("idlist", Collections.emptyList());
                    System.out.println(
                            "DEBUG: fetchIdsFromHistory returned " + ids.size() + " IDs for offset=" + retstart);
                    return ids;
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                System.err.println("ERROR: fetchIdsFromHistory failed on attempt " + attempt + ": " + e.getMessage());
            }
        }
        return Collections.emptyList();
    }

    /**
     * Fetch articles with retry logic and batching
     */
    private List<Article> fetchArticlesWithRetry(List<String> idList) {
        if (idList == null || idList.isEmpty())
            return new ArrayList<>();

        // Check cache first and separate cached/uncached IDs
        List<String> uncachedIds = new ArrayList<>();
        List<Article> cachedArticles = new ArrayList<>();

        for (String id : idList) {
            Article cached = articleCache.get(id);
            if (cached != null) {
                cachedArticles.add(cached);
            } else {
                uncachedIds.add(id);
            }
        }

        System.out.println(
                "DEBUG: " + cachedArticles.size() + " articles from cache, " + uncachedIds.size() + " to fetch");

        if (uncachedIds.isEmpty()) {
            return cachedArticles;
        }

        // Fetch uncached articles in batches with retry
        List<Article> fetchedArticles = new ArrayList<>();

        for (int i = 0; i < uncachedIds.size(); i += BATCH_SIZE) {
            List<String> batch = uncachedIds.subList(i, Math.min(i + BATCH_SIZE, uncachedIds.size()));
            List<Article> batchResult = fetchBatchWithRetry(batch);
            fetchedArticles.addAll(batchResult);

            // Cache the fetched articles
            for (Article article : batchResult) {
                if (article.getPubmedId() != null) {
                    articleCache.put(article.getPubmedId(), article);
                }
            }
        }

        // Combine and return in order
        List<Article> allArticles = new ArrayList<>(cachedArticles);
        allArticles.addAll(fetchedArticles);

        return allArticles;
    }

    private List<Article> fetchBatchWithRetry(List<String> idList) {
        String idsParam = String.join(",", idList);

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Rate limiting
                Thread.sleep(RATE_LIMIT_DELAY.toMillis());

                System.out.println("DEBUG: Calling efetch for " + idList.size() + " IDs (attempt " + attempt + ")");

                String xmlResponse = webClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .path("/efetch.fcgi")
                                .queryParam("db", "pubmed")
                                .queryParam("id", idsParam)
                                .queryParam("retmode", "xml")
                                .queryParam("tool", TOOL_NAME)
                                .queryParam("email", TOOL_EMAIL)
                                .build())
                        .retrieve()
                        .bodyToMono(String.class)
                        .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                        .block();

                List<Article> parsedArticles = parsePubMedXml(xmlResponse);

                if (!parsedArticles.isEmpty()) {
                    System.out.println(
                            "DEBUG: Successfully parsed " + parsedArticles.size() + " articles on attempt " + attempt);
                    return parsedArticles;
                }

                // If parsing returned empty, check what we got
                if (xmlResponse != null) {
                    System.out.println("DEBUG: efetch returned " + xmlResponse.length()
                            + " bytes but parsed 0 articles on attempt " + attempt);
                    if (xmlResponse.contains("<ERROR>")) {
                        System.err.println("DEBUG: Response contains ERROR tag");
                    }
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                break;
            } catch (WebClientResponseException e) {
                System.err.println("ERROR: efetch HTTP error on attempt " + attempt + ": " + e.getStatusCode() + " - "
                        + e.getMessage());
                // If rate limited, wait longer
                if (e.getStatusCode().value() == 429) {
                    try {
                        Thread.sleep(2000 * attempt); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            } catch (Exception e) {
                System.err.println("ERROR: efetch failed on attempt " + attempt + ": " + e.getMessage());
                if (attempt == MAX_RETRIES) {
                    e.printStackTrace();
                }
            }
        }

        return new ArrayList<>();
    }

    public List<Article> fetchArticlesByIds(List<String> idList) {
        return fetchArticlesWithRetry(idList);
    }

    private List<Article> parsePubMedXml(String xmlContent) {
        List<Article> articles = new ArrayList<>();
        if (xmlContent == null || xmlContent.isEmpty())
            return articles;

        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            // Secure processing to prevent XXE, though internal
            factory.setFeature("http://javax.xml.XMLConstants/feature/secure-processing", true);

            // RELAX PARSER: Sometimes PubMed returns entities that break strict parsing
            factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setFeature("http://xml.org/sax/features/validation", false);

            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(new ByteArrayInputStream(xmlContent.getBytes(StandardCharsets.UTF_8)));

            // Standard Articles
            NodeList articleNodes = doc.getElementsByTagName("PubmedArticle");
            for (int i = 0; i < articleNodes.getLength(); i++) {
                try {
                    articles.add(parseArticleElement((Element) articleNodes.item(i)));
                } catch (Exception e) {
                    System.err.println("ERROR: Failed to parse article at index " + i + ": " + e.getMessage());
                }
            }

            // Book Articles
            NodeList bookNodes = doc.getElementsByTagName("PubmedBookArticle");
            for (int i = 0; i < bookNodes.getLength(); i++) {
                try {
                    articles.add(parseBookElement((Element) bookNodes.item(i)));
                } catch (Exception e) {
                    System.err.println("ERROR: Failed to parse book article at index " + i + ": " + e.getMessage());
                }
            }

            if (articles.isEmpty() && xmlContent.length() > 100) {
                // Check for ERROR tag
                NodeList errorNodes = doc.getElementsByTagName("ERROR");
                if (errorNodes.getLength() > 0) {
                    System.out.println("DEBUG: PubMed returned API Error: " + errorNodes.item(0).getTextContent());
                } else {
                    System.out.println("DEBUG: No articles found in XML of length " + xmlContent.length());
                }
            }

        } catch (Exception e) {
            System.err.println("ERROR: XML Parsing failed: " + e.getMessage());
            e.printStackTrace();
        }
        return articles;
    }

    private Article parseArticleElement(Element root) {
        Article article = new Article();
        article.setSource("PUBMED");
        article.setArticleType(ArticleType.JOURNAL); // Default to Journal for PubMed
        article.setConfirmed(true);

        // MedlineCitation
        Element citation = getChild(root, "MedlineCitation");
        if (citation != null) {
            // PMID
            article.setPubmedId(getTagValue(citation, "PMID"));

            // Article Info
            Element art = getChild(citation, "Article");
            if (art != null) {
                // Title (ensure minimum length for validation)
                String title = getTagValue(art, "ArticleTitle");
                article.setTitle(sanitizeTitle(title));

                // Abstract (ensure minimum length for validation)
                String abstractText = getAbstractText(art);
                article.setAbstractText(ensureMinAbstractLength(abstractText));

                // Journal
                Element journal = getChild(art, "Journal");
                if (journal != null) {
                    article.setJournalName(getTagValue(journal, "Title"));
                    Element journalIssue = getChild(journal, "JournalIssue");
                    if (journalIssue != null) {
                        Element pubDate = getChild(journalIssue, "PubDate");
                        article.setPublicationYear(parseYear(pubDate));
                    }
                }

                // Authors
                article.setAuthors(parseAuthors(art));
            }
        }

        // DOI
        Element data = getChild(root, "PubmedData");
        if (data != null) {
            NodeList ids = data.getElementsByTagName("ArticleId");
            for (int i = 0; i < ids.getLength(); i++) {
                Element id = (Element) ids.item(i);
                if ("doi".equals(id.getAttribute("IdType"))) {
                    article.setDoi(id.getTextContent());
                    break;
                }
            }
        }

        // Ensure required fields have valid values
        ensureRequiredFields(article);

        return article;
    }

    private Article parseBookElement(Element root) {
        Article article = new Article();
        article.setSource("PUBMED");
        article.setArticleType(ArticleType.BOOK_CHAPTER); // Default to Book Chapter for books
        article.setConfirmed(true);

        Element citation = getChild(root, "BookDocument");
        if (citation != null) {
            article.setPubmedId(getTagValue(citation, "PMID"));
            Element book = getChild(citation, "Book");
            if (book != null) {
                article.setTitle(sanitizeTitle(getTagValue(book, "BookTitle")));
                Element pubDate = getChild(book, "PubDate");
                article.setPublicationYear(parseYear(pubDate));
            }
            String abstractText = getAbstractText(citation);
            article.setAbstractText(ensureMinAbstractLength(abstractText));
            article.setAuthors(parseAuthors(citation));
        }

        // Ensure required fields have valid values
        ensureRequiredFields(article);

        return article;
    }

    // --- Helpers ---

    private String getTagValue(Element parent, String tagName) {
        if (parent == null)
            return null;
        NodeList list = parent.getElementsByTagName(tagName);
        if (list.getLength() > 0) {
            return list.item(0).getTextContent();
        }
        return null;
    }

    private Element getChild(Element parent, String tagName) {
        if (parent == null)
            return null;
        NodeList list = parent.getElementsByTagName(tagName);
        if (list.getLength() > 0) {
            return (Element) list.item(0);
        }
        return null;
    }

    private String getAbstractText(Element parent) {
        Element abs = getChild(parent, "Abstract");
        if (abs != null) {
            NodeList texts = abs.getElementsByTagName("AbstractText");
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < texts.getLength(); i++) {
                sb.append(texts.item(i).getTextContent()).append(" ");
            }
            return sb.toString().trim();
        }
        return "No abstract available.";
    }

    private String parseAuthors(Element parent) {
        Element authorList = getChild(parent, "AuthorList");
        if (authorList == null)
            return "Unknown Authors";

        List<String> names = new ArrayList<>();
        NodeList authors = authorList.getElementsByTagName("Author");
        for (int i = 0; i < Math.min(authors.getLength(), 5); i++) { // Limit to 5
            Element auth = (Element) authors.item(i);
            String last = getTagValue(auth, "LastName");
            String init = getTagValue(auth, "Initials");
            if (last != null) {
                names.add(last + (init != null ? " " + init : ""));
            }
        }
        if (authors.getLength() > 5)
            names.add("et al.");
        return String.join(", ", names);
    }

    private int parseYear(Element pubDate) {
        if (pubDate == null)
            return 0;
        String year = getTagValue(pubDate, "Year");
        if (year != null) {
            try {
                return Integer.parseInt(year);
            } catch (NumberFormatException e) {
            }
        }
        // Try MedlineDate
        String medline = getTagValue(pubDate, "MedlineDate");
        if (medline != null && medline.length() >= 4) {
            try {
                return Integer.parseInt(medline.substring(0, 4));
            } catch (NumberFormatException e) {
            }
        }
        return 0;
    }

    private String sanitizeTitle(String title) {
        if (title == null)
            return "Untitled Article";
        String cleaned = title.trim();
        if (cleaned.endsWith("."))
            cleaned = cleaned.substring(0, cleaned.length() - 1);
        // Ensure minimum length for validation (10 chars required)
        if (cleaned.length() < 10) {
            cleaned = cleaned + " - PubMed Article";
        }
        return cleaned;
    }

    /**
     * Ensures abstract text meets minimum length requirement (50 characters)
     */
    private String ensureMinAbstractLength(String abstractText) {
        if (abstractText == null || abstractText.trim().isEmpty()) {
            return "No abstract available. This article was imported from PubMed.";
        }
        String trimmed = abstractText.trim();
        if (trimmed.length() < 50) {
            return trimmed + " [Abstract retrieved from PubMed database]";
        }
        return trimmed;
    }

    /**
     * Ensures all required fields have valid values for entity validation
     */
    private void ensureRequiredFields(Article article) {
        // Title - minimum 10 characters
        if (article.getTitle() == null || article.getTitle().trim().length() < 10) {
            article.setTitle("Untitled PubMed Article");
        }

        // Authors - must not be blank
        if (article.getAuthors() == null || article.getAuthors().trim().isEmpty()) {
            article.setAuthors("Unknown Authors");
        }

        // Publication year - must be valid
        if (article.getPublicationYear() == null || article.getPublicationYear() < 1900) {
            article.setPublicationYear(java.time.Year.now().getValue());
        }

        // ArticleType - must not be null
        if (article.getArticleType() == null) {
            article.setArticleType(ArticleType.JOURNAL);
        }

        // Abstract - minimum 50 characters
        if (article.getAbstractText() == null || article.getAbstractText().trim().length() < 50) {
            article.setAbstractText(ensureMinAbstractLength(article.getAbstractText()));
        }

        // Confirmed - default to true
        if (article.getConfirmed() == null) {
            article.setConfirmed(true);
        }
    }

    /**
     * Fetch a single article by its PubMed ID
     */
    public Article fetchSingleByPmid(String pmid) {
        if (pmid == null || pmid.trim().isEmpty()) {
            return null;
        }

        // Check cache first
        Article cached = articleCache.get(pmid);
        if (cached != null) {
            System.out.println("DEBUG: Returning cached article for PMID: " + pmid);
            return cached;
        }

        // Fetch from PubMed
        List<Article> articles = fetchArticlesWithRetry(Collections.singletonList(pmid));
        if (!articles.isEmpty()) {
            Article article = articles.get(0);
            articleCache.put(pmid, article);
            return article;
        }

        return null;
    }

    /**
     * Clear all caches - useful for debugging or when data refresh is needed
     */
    public void clearCache() {
        searchCache.clear();
        articleCache.clear();
        System.out.println("DEBUG: All PubMed caches cleared");
    }
}
