SELECT * 
FROM properties
JOIN reservations ON property_id = properties.id
JOIN users ON users.id = guest_id
WHERE guest_id = 5;