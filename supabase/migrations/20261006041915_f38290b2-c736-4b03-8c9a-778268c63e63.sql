ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS transaction_date date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS balance_after integer;

CREATE OR REPLACE FUNCTION public.record_inventory_transaction(
  _inventory_id uuid, _type text, _quantity integer, _date date, _remarks text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE cur integer; uom text; newbal integer; who text;
BEGIN
  IF _type NOT IN ('Received','Issued') THEN RAISE EXCEPTION 'Invalid transaction type'; END IF;
  IF _quantity IS NULL OR _quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
  SELECT quantity, unit_of_measure INTO cur, uom FROM public.inventory WHERE id = _inventory_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF _type = 'Issued' AND _quantity > cur THEN
    RAISE EXCEPTION 'Cannot issue % — only % available', _quantity, cur;
  END IF;
  newbal := CASE WHEN _type = 'Received' THEN cur + _quantity ELSE cur - _quantity END;
  UPDATE public.inventory SET quantity = newbal WHERE id = _inventory_id;
  SELECT COALESCE(NULLIF(full_name,''), username) INTO who FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.inventory_transactions(inventory_id, transaction_type, quantity, unit, transaction_date, notes, performed_by, created_by, balance_after)
  VALUES (_inventory_id, _type, _quantity, uom, COALESCE(_date, current_date), _remarks, who, auth.uid(), newbal);
  RETURN newbal;
END; $$;

REVOKE EXECUTE ON FUNCTION public.record_inventory_transaction(uuid,text,integer,date,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_inventory_transaction(uuid,text,integer,date,text) TO authenticated;