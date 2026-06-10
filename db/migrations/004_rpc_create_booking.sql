-- Migration: 004_rpc_create_booking
-- Descripción: RPC para crear booking + add-ons en una sola transacción atómica
-- Schema: public (para ser accesible vía PostgREST sin cambiar pgrst.db_schemas)

CREATE OR REPLACE FUNCTION public.lizco_create_booking(
  p_package_id         UUID,
  p_customer_id        UUID,
  p_travel_date        DATE,
  p_travelers_count    INT,
  p_base_price         NUMERIC,
  p_multiplier         NUMERIC,
  p_total_price        NUMERIC,
  p_addon_ids          UUID[],
  p_addon_quantities   INT[],
  p_addon_prices       NUMERIC[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  -- Insertar booking
  INSERT INTO enterprise_tours.bookings (
    package_id,
    customer_id,
    travel_date,
    travelers_count,
    base_price_applied,
    season_multiplier_applied,
    total_calculated_price,
    status,
    lead_source
  ) VALUES (
    p_package_id,
    p_customer_id,
    p_travel_date,
    p_travelers_count,
    p_base_price,
    p_multiplier,
    p_total_price,
    'PENDING',
    'lizco_global_tours_web'
  )
  RETURNING id INTO v_booking_id;

  -- Insertar add-ons en bulk (solo si hay add-ons seleccionados)
  IF array_length(p_addon_ids, 1) > 0 THEN
    INSERT INTO enterprise_tours.booking_add_ons (
      booking_id,
      add_on_id,
      quantity,
      calculated_price
    )
    SELECT
      v_booking_id,
      unnest(p_addon_ids),
      unnest(p_addon_quantities),
      unnest(p_addon_prices);
  END IF;

  RETURN v_booking_id;
END;
$$;

-- Grant de ejecución para service_role
GRANT EXECUTE ON FUNCTION public.lizco_create_booking(
  UUID, UUID, DATE, INT, NUMERIC, NUMERIC, NUMERIC, UUID[], INT[], NUMERIC[]
) TO service_role;

COMMENT ON FUNCTION public.lizco_create_booking IS
  'Crea un booking con sus add-ons en una transacción atómica. Uso exclusivo del API LizCo (service_role).';
