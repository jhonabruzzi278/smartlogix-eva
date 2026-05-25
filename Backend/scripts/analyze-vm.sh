#!/bin/bash
# ============================================
# ANÁLISIS DE RECURSOS - SmartLogix VM
# Ejecutar: bash analyze-vm.sh
# ============================================

echo "========================================"
echo "  ANÁLISIS DE VM - $(date)"
echo "========================================"

echo ""
echo "--- CPU ---"
echo "Cores: $(nproc)"
top -bn1 | head -5

echo ""
echo "--- MEMORIA ---"
free -h

echo ""
echo "--- DISCO ---"
df -h / | tail -1

echo ""
echo "--- DOCKER CONTENEDORES ---"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPct}}\t{{.NetIO}}"

echo ""
echo "--- TOP 5 PROCESOS POR MEMORIA ---"
ps aux --sort=-%mem | head -6

echo ""
echo "--- DOCKER IMÁGENES (TAMAÑO) ---"
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"

echo ""
echo "--- SWAP ---"
swapon --show 2>/dev/null || echo "No hay swap configurado"

echo ""
echo "========================================"
echo "  RESUMEN"
echo "========================================"

MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
MEM_USADA=$(free -m | awk '/^Mem:/{print $3}')
MEM_DISP=$(free -m | awk '/^Mem:/{print $7}')
echo "RAM total:   ${MEM_TOTAL}MB"
echo "RAM usada:   ${MEM_USADA}MB (${MEM_PCT}%)"
echo "RAM dispon:  ${MEM_DISP}MB"

DOCKER_MEM=$(docker stats --no-stream --format "{{.MemUsage}}" | awk -F'/' '{sum+=$1} END {printf "%.0f", sum}')
echo "Docker ≈:    ${DOCKER_MEM}MB"
echo ""

if [ "$MEM_DISP" -lt 100 ]; then
    echo "⚠️  PELIGRO: Menos de 100MB libres. ¡Optimiza urgente!"
elif [ "$MEM_DISP" -lt 250 ]; then
    echo "⚠️  ADVERTENCIA: Poca memoria libre. Considera optimizar."
else
    echo "✅ Memoria aceptable."
fi
