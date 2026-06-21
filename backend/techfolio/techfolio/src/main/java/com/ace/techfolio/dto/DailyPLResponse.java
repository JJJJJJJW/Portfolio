package com.ace.techfolio.dto;

public record DailyPLResponse(
    String date,
    double pl,
    double pct,
    double realizedPL,
    double unrealizedPL
) {}
