-- =====================================================================
-- 0011 · Localização do cliente (preenchida pela busca de endereço no
-- cadastro, via Nominatim/OpenStreetMap, sem chave de API). Endereço/
-- cidade/UF continuam como texto livre; latitude/longitude são só o
-- ponto no mapa.
-- =====================================================================

alter table clients add column latitude  numeric(10,7);
alter table clients add column longitude numeric(10,7);
