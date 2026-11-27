-- Apelido escolhido pelo Eduardo (ex.: "Reserva", "Caixinha do AP"); o Open Finance não mexe nele
alter table public.investimentos add column if not exists apelido text check (char_length(apelido) <= 60);
