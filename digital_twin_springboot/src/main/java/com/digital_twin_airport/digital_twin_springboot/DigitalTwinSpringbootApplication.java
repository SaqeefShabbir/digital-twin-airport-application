package com.digital_twin_airport.digital_twin_springboot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EntityScan(basePackages = "com.airport.digitaltwin.model")
@EnableJpaRepositories(basePackages = "com.airport.digitaltwin.repository")
@EnableCaching
@EnableScheduling
@EnableAsync
@EnableKafka
public class DigitalTwinSpringbootApplication {

	public static void main(String[] args) {
		SpringApplication.run(DigitalTwinSpringbootApplication.class, args);
	}

}
