package com.ace.techfolio.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Represents a global stock or crypto pair in the master lookup list.
 */
@Entity
@Table(name = "asset_master")
public class AssetMaster {

    @Id
    @Column(name = "ticker", nullable = false, length = 50)
    private String ticker;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "exchange", nullable = false, length = 100)
    private String exchange;

    @Column(name = "asset_type", nullable = false, length = 50)
    private String assetType;

    public AssetMaster() {
    }

    public AssetMaster(String ticker, String name, String exchange, String assetType) {
        this.ticker = ticker;
        this.name = name;
        this.exchange = exchange;
        this.assetType = assetType;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getExchange() {
        return exchange;
    }

    public void setExchange(String exchange) {
        this.exchange = exchange;
    }

    public String getAssetType() {
        return assetType;
    }

    public void setAssetType(String assetType) {
        this.assetType = assetType;
    }
}
