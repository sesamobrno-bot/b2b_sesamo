-- Rename categories in items table
UPDATE items SET category = 'Bread' WHERE category = 'Bread & Pastries';
UPDATE items SET category = 'Pastries' WHERE category = 'Pasta';
UPDATE items SET category = 'Focaccia & Pizza' WHERE category = 'Pizza';
UPDATE items SET category = 'Cakes' WHERE category = 'Food & Beverages';