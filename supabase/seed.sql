-- Memento — Datos de ejemplo (los mismos que hoy están mockeados en el
-- frontend). Correr en el SQL Editor de Supabase — como se ejecuta con
-- privilegios de administrador, no lo bloquea RLS.
-- Reemplazar por catálogo real cuando esté definido.

insert into cajas (nombre, descripcion, precio, capacidad) values
  ('Caja Clásica', 'Ideal para regalos sencillos.', 2500, 3),
  ('Caja Premium', 'Mayor capacidad para sorprender.', 4500, 5),
  ('Caja Deluxe', 'Nuestra caja más exclusiva.', 7000, 8);

insert into tematicas (nombre, descripcion) values
  ('Noche de Películas', 'Snacks y bebida para una noche perfecta de películas.'),
  ('Cumpleaños', 'Para sorprender en una fecha especial.'),
  ('En Pareja', 'Detalles para compartir y disfrutar juntos.'),
  ('Relax', 'Té y aromas para reconectar contigo mismo.'),
  ('Momento Café', 'Un combo especial para los amantes del café y la calma.');

insert into productos (nombre, descripcion, precio, categoria, stock_actual, stock_minimo) values
  ('Doritos', 'Nachos sabor queso.', 800, 'snack', 24, 5),
  ('Papitas', 'Papas fritas clásicas.', 700, 'snack', 3, 5),
  ('Palitos salados', 'Palitos crocantes.', 600, 'snack', 18, 5),
  ('Alfajor de chocolate', 'Relleno de dulce de leche.', 900, 'dulce', 12, 5),
  ('Chocolate', 'Tableta de chocolate con leche.', 1200, 'dulce', 0, 5),
  ('Gomitas', 'Surtido de gomitas frutales.', 750, 'dulce', 20, 5),
  ('Gaseosa 500ml', 'A elección de sabor.', 1000, 'bebida', 15, 5),
  ('Café en grano', 'Origen local, tueste medio.', 1800, 'bebida', 4, 5);
