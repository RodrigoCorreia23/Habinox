-- Apaga os dados de demonstração e de ensaio (catálogo, carrinhos, encomendas).
-- Mantém os utilizadores, os artigos do ERP (sem margem) e os settings. Só para desenvolvimento local.
begin;
delete from consents;
delete from orders;
delete from cart_items;
delete from carts;
delete from quotes;
update products set published_version_id = null;
delete from option_rules;
delete from product_versions;
delete from products;
delete from option_values;
delete from option_definitions;
update categories set parent_id = null;
delete from categories;
delete from sectors;
update materials set margin = null;
alter sequence order_number_seq restart with 1;
commit;
