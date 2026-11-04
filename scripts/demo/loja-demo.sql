-- Dados de DEMONSTRAÇÃO, só para desenvolvimento local (nunca em staging/produção).
-- Um portão de correr publicado, com opções, regras, fórmula, um sector e margens nos
-- 6 artigos do ERP de teste (criados aqui se ainda não existirem; são os mesmos do adaptador fake).
-- Custos e margens INVENTADOS. Carregar: pnpm db:demo  ·  apagar: pnpm db:demo:clean
begin;
insert into materials (erp_code, name, unit, cost, weight_per_unit, cost_updated_at) values
  ('TF4040', 'Tubo ferro 40×40×2', 'm', '3.2000', '2.3200', now()),
  ('TI4040', 'Tubo inox 304 40×40×2', 'm', '12.4000', '2.4000', now()),
  ('TFB20', 'Barra ferro 20×20', 'm', '1.1000', '3.1400', now()),
  ('TIB20', 'Barra inox 304 20×20', 'm', '4.0000', '3.1700', now()),
  ('CHF2', 'Chapa ferro 2 mm', 'm²', '18.5000', '15.7000', now()),
  ('LAC', 'Lacagem (serviço externo)', 'm²', '22.0000', null, now())
on conflict (erp_code) do nothing;
update materials set margin='0.3000' where erp_code in ('TF4040','TFB20');
update materials set margin='0.2500' where erp_code='TI4040';
update materials set margin='0.1000' where erp_code='LAC';
insert into sectors (name,hourly_rate_cents,margin) values ('Serralharia',2350,'0.2000');
insert into categories (slug,name,description,position) values ('portoes','{"pt":"Portões"}','{"pt":"De correr, de batente e pedonais, por medida."}',0);
insert into categories (slug,name,parent_id) select 'portoes-de-correr','{"pt":"Portões de correr"}',id from categories where slug='portoes';
insert into option_definitions (key,name,type,unit) values ('largura','{"pt":"Largura"}','dimension','cm'),('altura','{"pt":"Altura"}','dimension','cm');
insert into option_definitions (key,name,type,display,help_text) values ('material','{"pt":"Material"}','choice','pills',null),('cor','{"pt":"Cor"}','choice','swatches','{"pt":"Lacagem em cor RAL."}'),('motorizacao','{"pt":"Motorização"}','choice','pills',null);
insert into option_values (option_id,key,label,position) select id,v.k,('{"pt":"'||v.l||'"}')::jsonb,v.p from option_definitions, (values ('ferro','Ferro lacado',0),('inox','Inox',1),('aluminio','Alumínio',2)) v(k,l,p) where key='material';
insert into option_values (option_id,key,label,position,ral_code,swatch_hex) select id,v.k,('{"pt":"'||v.l||'"}')::jsonb,v.p,v.r,v.h from option_definitions, (values ('ral_7016','Cinzento antracite',0,'7016','#383E42'),('ral_9005','Preto',1,'9005','#0A0A0A'),('ral_9016','Branco',2,'9016','#F1F0EA')) v(k,l,p,r,h) where key='cor';
insert into option_values (option_id,key,label,position) select id,'sem_motor','{"pt":"Sem motor"}',0 from option_definitions where key='motorizacao';
insert into option_values (option_id,key,label,position,material_id) select id,'motor','{"pt":"Motor e 2 comandos"}',1,(select id from materials where erp_code='TFB20') from option_definitions where key='motorizacao';
insert into products (category_id,slug,name,description) select id,'portao-de-correr','{"pt":"Portão de correr"}','{"pt":"Folha única sobre calha, com barras verticais. Ferro lacado ou inox."}' from categories where slug='portoes-de-correr';
insert into product_versions (product_id,version,status,consumables_rate,validated_at,published_at) select id,1,'published','0.1000',now(),now() from products;
update products set published_version_id=(select id from product_versions);
insert into product_options (product_version_id,option_id,position,var,required,min,max,step) select v.id,o.id,x.p,x.var,x.req,x.mn,x.mx,x.st from product_versions v, option_definitions o, (values ('largura',0,'L',true,1000,6000,10),('altura',1,'H',true,800,2200,10),('material',2,null,true,null,null,null),('cor',3,null,true,null,null,null),('motorizacao',4,null,true,null,null,null)) x(k,p,var,req,mn,mx,st) where o.key=x.k;
insert into product_option_values (product_option_id,option_value_id,position,is_default) select po.id, ov.id, ov.position, ov.position=0 from product_options po join option_values ov on ov.option_id=po.option_id where ov.key<>'aluminio';
insert into option_rules (product_version_id,position,conditions,effect) select null,0,'[{"option":"material","op":"eq","value":"inox"}]','{"type":"hide","option":"cor"}';
insert into option_rules (product_version_id,position,conditions,effect,message) select id,0,'[{"option":"altura","op":"gt","value":{"option":"largura","factor":1}}]','{"type":"forbid"}','{"pt":"O portão não pode ser mais alto do que largo."}' from product_versions;
insert into formula_variables (product_version_id,name,expr,position,label,show_to_customer) select id,'barras','ceil(L / 0,12)',0,'{"pt":"Barras"}',true from product_versions;
insert into formula_lines (product_version_id,position,label,kind,quantity_expr,unit,article_option_id) select v.id,0,'Tubo do quadro','material','2 × (L + H)','m',o.id from product_versions v, option_definitions o where o.key='material';
insert into formula_line_materials (formula_line_id,option_value_id,material_id) select l.id, ov.id, m.id from formula_lines l, option_values ov, materials m where l.label='Tubo do quadro' and ((ov.key='ferro' and m.erp_code='TF4040') or (ov.key='inox' and m.erp_code='TI4040'));
insert into formula_lines (product_version_id,position,label,kind,quantity_expr,unit,material_id) select v.id,1,'Barras','material','barras × H','m',(select id from materials where erp_code='TFB20') from product_versions v;
insert into formula_lines (product_version_id,position,label,kind,quantity_expr,unit,material_id,conditions) select v.id,2,'Lacagem','external','L × H','m²',(select id from materials where erp_code='LAC'),'[{"option":"material","op":"in","values":["ferro"]}]' from product_versions v;
insert into formula_lines (product_version_id,position,label,kind,quantity_expr,unit,sector_id) select v.id,3,'Serralharia','labour','6 + 2,4 × L + 0,9 × L × H','h',(select id from sectors) from product_versions v;
commit;
