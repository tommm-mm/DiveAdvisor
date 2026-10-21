-- Test data only (clearly marked [TEST]). Mirrors data/diving.csv. Safe to re-run.
insert into public.dive_centers
  (slug, name, region, province, city, address, lat, lng, phone, email, website,
   federations, dive_types, services, languages, verified_at, source)
values
  ('test-diving-esempio-lago-lecco', '[TEST] Diving Esempio Lago', 'Lombardia', 'CO', 'Lecco', 'Via di prova 1',
   45.8566, 9.3977, '+39 000 0000000', 'test@example.com', 'https://example.com',
   '{PADI,SSI}', '{lago,tecnico}', '{noleggio,corsi,ricarica}', '{it,en}', '2026-10-21', 'manual'),
  ('test-diving-esempio-mare-camogli', '[TEST] Diving Esempio Mare', 'Liguria', 'GE', 'Camogli', 'Via di prova 2',
   44.3488, 9.1554, '+39 000 0000001', 'test2@example.com', 'https://example.com',
   '{SSI,TDI}', '{mare,corsi}', '{noleggio,barca}', '{it,en,de}', '2026-10-21', 'manual')
on conflict (slug) do nothing;

select slug, region, dive_types from public.dive_centers;
