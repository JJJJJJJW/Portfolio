package com.ace.techfolio.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HealthControllerTest {

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    @InjectMocks
    private HealthController healthController;

    @Test
    void ping_ReturnsPong() {
        ResponseEntity<String> response = healthController.ping();

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertEquals("pong", response.getBody());
    }

    @Test
    void checkHealth_DatabaseUp_ReturnsUpStatus() throws SQLException {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getCatalog()).thenReturn("techfolio_db");
        when(connection.isValid(3)).thenReturn(true);

        ResponseEntity<Map<String, Object>> response = healthController.checkHealth();

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals("UP", body.get("status"));
        assertTrue(body.containsKey("timestamp"));

        @SuppressWarnings("unchecked")
        Map<String, Object> dbMap = (Map<String, Object>) body.get("database");
        assertNotNull(dbMap);
        assertEquals("UP", dbMap.get("status"));
        assertEquals("techfolio_db", dbMap.get("database"));
        assertEquals(true, dbMap.get("validConnection"));
    }

    @Test
    void checkHealth_DatabaseDown_ReturnsDegradedStatus() throws SQLException {
        when(dataSource.getConnection()).thenThrow(new SQLException("Connection refused"));

        ResponseEntity<Map<String, Object>> response = healthController.checkHealth();

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals("DEGRADED", body.get("status"));

        @SuppressWarnings("unchecked")
        Map<String, Object> dbMap = (Map<String, Object>) body.get("database");
        assertNotNull(dbMap);
        assertEquals("DOWN", dbMap.get("status"));
        assertEquals("Connection refused", dbMap.get("error"));
    }
}
