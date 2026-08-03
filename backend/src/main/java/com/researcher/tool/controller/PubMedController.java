package com.researcher.tool.controller;

import com.researcher.tool.service.PubMedService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/pubmed")
public class PubMedController {

    private final PubMedService pubMedService;

    public PubMedController(PubMedService pubMedService) {
        this.pubMedService = pubMedService;
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "ALL") String type,
            @RequestParam(required = false, defaultValue = "0") int offset,
            @RequestParam(required = false, defaultValue = "10") int limit) {

        System.out.println("DEBUG: PubMedController.search called with query=" + query + ", type=" + type + ", offset="
                + offset + ", limit=" + limit);
        Map<String, Object> result = pubMedService.searchPubMed(query, type, offset, limit);
        System.out.println("DEBUG: PubMedController.search returning: count=" + result.get("count") + ", articles size="
                + ((java.util.List) result.get("articles")).size());
        return ResponseEntity.ok(result);
    }
}
