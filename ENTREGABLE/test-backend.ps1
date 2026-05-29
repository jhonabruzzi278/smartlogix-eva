# SmartLogix - Prueba automatica de todos los endpoints
# Compatible con PowerShell 5.1 y superior
# Uso: .\ENTREGABLE\test-backend.ps1 -BaseUrl "http://104.248.60.29"
param(
    [string]$BaseUrl = "http://localhost:80"
)

$ErrorActionPreference = "Continue"
$passed = 0
$failed = 0

function Test-Endpoint {
    param($Name, $Method, $Path, $Body, $ExpectedStatus = 200, $CheckProperty)
    try {
        $uri = "$BaseUrl$Path"
        $bodyJson = if ($Body) { $Body | ConvertTo-Json -Compress } else { $null }

        if ($bodyJson) {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -Body $bodyJson -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri $uri -Method $Method -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
        }

        Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Gray
        $body = $response.Content
        Write-Host "  Body: $($body.Substring(0, [Math]::Min(120, $body.Length)))..." -ForegroundColor Gray

        if ($CheckProperty) {
            try {
                $obj = $body | ConvertFrom-Json
                if ($obj -is [array]) { $obj = $obj[0] }
                if ($obj.PSObject.Properties.Name -notcontains $CheckProperty) {
                    Write-Host "  [WARN] Propiedad '$CheckProperty' no encontrada" -ForegroundColor Yellow
                }
            } catch {}
        }

        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:passed++
        try { return $body | ConvertFrom-Json } catch { return $body }
    } catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { "N/A" }
        Write-Host "  Status: $statusCode" -ForegroundColor Gray
        Write-Host "  [FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red
        $script:failed++
        return $null
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SmartLogix - Prueba de Backend" -ForegroundColor Cyan
Write-Host " Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ── 1. Health checks ──
Write-Host "[1] HEALTH CHECKS" -ForegroundColor Cyan
$health = Test-Endpoint "BFF Health" "GET" "/healthz"
Test-Endpoint "Orders service UP" "GET" "/api/orders/test"

# ── 2. Inventario ──
Write-Host "`n[2] INVENTARIO" -ForegroundColor Cyan
$inv = Test-Endpoint "Listar inventario" "GET" "/api/inventory" -CheckProperty "stock"
if ($inv -and $inv.Count -gt 0) {
    $sku = $inv[0].sku
    $stockAntes = $inv[0].stock
    Write-Host "  SKU de prueba: $sku (stock inicial: $stockAntes)" -ForegroundColor Gray

    Test-Endpoint "Consultar SKU" "GET" "/api/inventory/$sku"
    Test-Endpoint "Ajustar +5" "POST" "/api/inventory/$sku/adjust?delta=5"
    Test-Endpoint "Ajustar -2" "POST" "/api/inventory/$sku/adjust?delta=-2"
}

# ── 3. Pedidos ──
Write-Host "`n[3] PEDIDOS (CRUD)" -ForegroundColor Cyan

$order1 = Test-Endpoint "Crear pedido" "POST" "/api/orders" -Body @{
    customerId = 1; sku = "100001"; quantity = 1
} -CheckProperty "orderId"

Test-Endpoint "Listar pedidos" "GET" "/api/orders" -CheckProperty "status"

if ($order1 -and $order1.orderId) {
    $oid = $order1.orderId
    Test-Endpoint "Confirmar pedido" "PUT" "/api/orders/$oid/confirm" -CheckProperty "status"
    Test-Endpoint "Asignar transportista" "PUT" "/api/orders/$oid/assign?transporter=shipper01" -CheckProperty "assigned_to"
}

$order2 = Test-Endpoint "Crear pedido 2 (cancelar)" "POST" "/api/orders" -Body @{
    customerId = 2; sku = "100002"; quantity = 1
}
if ($order2 -and $order2.orderId) {
    $oid2 = $order2.orderId
    Test-Endpoint "Confirmar pedido 2" "PUT" "/api/orders/$oid2/confirm"
    Test-Endpoint "Cancelar pedido 2" "PUT" "/api/orders/$oid2/cancel" -Body @{
        reason = "Prueba cancelacion"
    }
    Test-Endpoint "Eliminar pedido 2" "DELETE" "/api/orders/$oid2"
}

# ── 4. Envios ──
Write-Host "`n[4] ENVIOS" -ForegroundColor Cyan
$shipments = Test-Endpoint "Listar envios" "GET" "/api/shipments" -CheckProperty "tracking"
if ($shipments -and $shipments.Count -gt 0) {
    $sid = $shipments[0].id
    Test-Endpoint "Avanzar a EN_REPARTO" "PUT" "/api/shipments/$sid/stage?stage=EN_REPARTO"
    Test-Endpoint "Entregar envio" "PUT" "/api/shipments/$sid/stage?stage=ENTREGADO" -Body @{
        customerCode = "C999"; recipientRut = "11111111-1"
    }
}

# ── 5. Notificaciones ──
Write-Host "`n[5] NOTIFICACIONES / TRAZABILIDAD" -ForegroundColor Cyan
Test-Endpoint "Trazabilidad orden 1" "GET" "/api/notifications/order/1"

# ── 6. Ventas ──
Write-Host "`n[6] VENTAS" -ForegroundColor Cyan
Test-Endpoint "Listar ventas" "GET" "/api/sales"

# ── 7. Clientes ──
Write-Host "`n[7] CLIENTES" -ForegroundColor Cyan
Test-Endpoint "Listar clientes" "GET" "/api/customers"

# ── Resumen ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " RESULTADO: $passed PASS / $failed FAIL" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
}
