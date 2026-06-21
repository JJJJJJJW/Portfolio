package com.ace.techfolio.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async configuration for the Stock Analyzer background pipeline.
 *
 * <p>Thread pool is deliberately small (core=1, max=2) to keep memory
 * usage under the 512MB Render free tier cap. The pipeline processes
 * tickers sequentially, so parallelism is not needed — this pool
 * simply prevents blocking the HTTP request thread.</p>
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    @Bean(name = "stockAnalyzerExecutor")
    public Executor stockAnalyzerExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(5);
        executor.setThreadNamePrefix("stock-analyzer-");
        executor.setRejectedExecutionHandler((r, e) ->
                log.warn("Stock analyzer task rejected — pool is full. Task: {}", r.toString()));
        executor.initialize();
        return executor;
    }
}
