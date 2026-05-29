# SmartLogix - Prueba automatica de todos los endpoints
# Uso: powershell -ExecutionPolicy Bypass -File ENTREGABLE\test-backend.ps1
param(
    [string]$BaseUrl = "http://localhost:80"
)

$ErrorActionPreference = "Continue"
$passed = 0
$failed = 0

function Test-Endpoint {
    param($Name, $Method, $Path, $Body, $ExpectedStatus = 200, $CheckProperty)
    try {
        $headers = @{"Content-Type" = "application/json"}
        $params = @{
            Uri         = "$BaseUrl$Path"
            Method      = $Method
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Compress)
        }
        $response = Invoke-RestMethod @params -StatusCodeVariable statusCode
        Write-Host "  Status: $statusCode" -ForegroundColor Gray
        $result = $response | ConvertTo-Json -Depth 4 -Compress
        Write-Host "  Body: $($result.Substring(0, [Math]::Min(120, $result.Length)))..." -ForegroundColor Gray
        
        $ok = $true
        if ($CheckProperty -and $response.PSObject.Properties.Name -notcontains $CheckProperty) {
            Write-Host "  [WARN] Propiedad '$CheckProperty' no encontrada" -ForegroundColor Yellow
        }
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:passed++
        return $response
    } catch {
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

# Crear
$order1 = Test-Endpoint "Crear pedido" "POST" "/api/orders" -Body @{
    customerId = 1; sku = "100001"; quantity = 1
} -CheckProperty "orderId"

# Listar
Test-Endpoint "Listar pedidos" "GET" "/api/orders" -CheckProperty "status"

# Confirmar
if ($order1 -and $order1.orderId) {
    $oid = $order1.orderId
    Test-Endpoint "Confirmar pedido" "PUT" "/api/orders/$oid/confirm" -CheckProperty "status"
    
    # Asignar transportista
    Test-Endpoint "Asignar transportista" "PUT" "/api/orders/$oid/assign?transporter=shipper01" -CheckProperty "assigned_to"
}

# Crear y cancelar
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
Test-Endpoint "Listar envios" "GET" "/api/shipments" -CheckProperty "tracking"

$shipments = Test-Endpoint "Listar envios" "GET" "/api/shipments"
if ($shipments -and $shipments.Count -gt 0) {
    $sid = $shipments[0].id
    Test-Endpoint "Avanzar a EN_REPARTO" "PUT" "/api/shipments/$sid/stage?stage=EN_REPARTO"
    Test-Endpoint "Entregar envio" "PUT" "/api/shipments/$sid/stage?stage=ENTREGADO" -Body @{
        customerCode = "C999"; recipientRut = "11111111-1"
    }
}

# ── 5. Notificaciones ──
Write-Host "`n[5] NOTIFICACIONES / TRAZABILIDAD" -ForegroundColor Cyan
Test-Endpoint "Trazabilidad orden 1" "GET" "/api/notifications/order/1" -CheckProperty "message"

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
