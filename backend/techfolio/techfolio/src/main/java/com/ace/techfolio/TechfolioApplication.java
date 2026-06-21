package com.ace.techfolio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TechfolioApplication {

	public static void main(String[] args) {
		SpringApplication.run(TechfolioApplication.class, args);
	}

}
