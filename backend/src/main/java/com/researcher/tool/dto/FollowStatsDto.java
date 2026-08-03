package com.researcher.tool.dto;

public class FollowStatsDto {
    private long followersCount;
    private long followingCount;

    public FollowStatsDto() {
    }

    public FollowStatsDto(long followersCount, long followingCount) {
        this.followersCount = followersCount;
        this.followingCount = followingCount;
    }

    public long getFollowersCount() {
        return followersCount;
    }

    public void setFollowersCount(long followersCount) {
        this.followersCount = followersCount;
    }

    public long getFollowingCount() {
        return followingCount;
    }

    public void setFollowingCount(long followingCount) {
        this.followingCount = followingCount;
    }
}
