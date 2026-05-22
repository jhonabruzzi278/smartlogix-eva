package com.inventory_service.service;

import com.smartlogix.contracts.events.InventoryResponse;
import com.inventory_service.model.Inventory;
import com.inventory_service.repository.InventoryRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    public List<Inventory> getAllInventory() {
        return inventoryRepository.findAll();
    }

    public Optional<Inventory> getBySku(String sku) {
        return inventoryRepository.findBySku(sku);
    }

    @Transactional
    public Inventory createInventory(Inventory inventory) {
        inventory.setSku(inventory.getSku().trim().toUpperCase().replaceAll("\\s+", "-"));
        return inventoryRepository.save(inventory);
    }

    @Transactional
    public Optional<Inventory> updateInventory(String sku, Inventory updates) {
        return inventoryRepository.findBySku(sku).map(existing -> {
            if (updates.getName() != null) existing.setName(updates.getName());
            if (updates.getPrice() != null) existing.setPrice(updates.getPrice());
            if (updates.getCost() != null) existing.setCost(updates.getCost());
            if (updates.getCategory() != null) existing.setCategory(updates.getCategory());
            if (updates.getStock() != null) existing.setStock(updates.getStock());
            return inventoryRepository.save(existing);
        });
    }

    @Transactional
    public boolean deleteInventory(String sku) {
        if (!inventoryRepository.existsBySku(sku)) return false;
        inventoryRepository.deleteBySku(sku);
        return true;
    }

    @Transactional
    public Inventory adjustStock(String sku, Integer delta) {
        Inventory inventory = inventoryRepository.findBySku(sku)
                .orElseThrow(() -> new RuntimeException("SKU not found: " + sku));
        inventory.setStock(Math.max(inventory.getStock() + delta, 0));
        return inventoryRepository.save(inventory);
    }

    @Transactional
    public InventoryResponse deductStock(Long orderId, String sku, Integer quantity) {
        if (sku == null || quantity == null || quantity <= 0) {
            return InventoryResponse.builder()
                    .orderId(orderId)
                    .success(false)
                    .message("Invalid order payload: sku and quantity are required")
                    .build();
        }

        Optional<Inventory> maybeInventory = inventoryRepository.findBySku(sku);
        if (maybeInventory.isEmpty()) {
            return InventoryResponse.builder()
                    .orderId(orderId)
                    .success(false)
                    .message("SKU not found: " + sku)
                    .build();
        }

        Inventory inventory = maybeInventory.get();
        if (inventory.getStock() < quantity) {
            return InventoryResponse.builder()
                    .orderId(orderId)
                    .success(false)
                    .message("Insufficient stock for SKU: " + sku)
                    .build();
        }

        inventory.setStock(inventory.getStock() - quantity);
        inventoryRepository.save(inventory);
        log.info("Stock updated for sku={}, remaining={}", sku, inventory.getStock());

        return InventoryResponse.builder()
                .orderId(orderId)
                .success(true)
                .message("Inventory updated")
                .build();
    }
}
