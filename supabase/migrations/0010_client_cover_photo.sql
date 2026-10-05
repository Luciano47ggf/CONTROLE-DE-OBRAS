-- =====================================================================
-- 0010 · Foto de capa do cliente, separada do logo.
--   * O card do cliente deixa de usar a foto de uma obra instalada como
--     prévia (isso volta a aparecer só na visão detalhada, por ponto de
--     exposição) e passa a usar essa capa, enviada pelo usuário.
--   * Reaproveita o Storage já liberado para a pasta "clientes" (0009);
--     não precisa de nova policy.
-- =====================================================================

alter table clients add column cover_path text;
