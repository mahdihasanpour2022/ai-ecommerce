# Domain Glossary

| Term | Definition |
| --- | --- |
| Product | A sellable automotive replacement-part record with descriptive, classification, compatibility, and commercial information. Product-versus-variant modeling is open. |
| SKU | A business identifier for an inventory-tracked sellable item. Format and uniqueness scope are open. |
| Category | A navigational or classificatory grouping of products. Hierarchy and multi-category membership are open. |
| Brand | The commercial manufacturer or brand associated with a product. |
| Vehicle | A real-world automobile described by identifying attributes used for fitment. Whether individual vehicles are stored is open. |
| Vehicle Model | A named vehicle product line within a vehicle brand/manufacturer. |
| Vehicle Trim | A model configuration that may narrow compatibility by year, engine, body, or equipment. Exact dimensions are open. |
| Vehicle Compatibility | An assertion that a product fits a defined vehicle scope, potentially qualified by notes or exclusions. |
| Inventory | The stock state for a sellable item at a location or aggregate scope. Multi-location support is open. |
| Available Quantity | Quantity currently eligible to promise; its formula relative to on-hand and reserved stock is open. |
| Reserved Quantity | Stock temporarily allocated to pending demand and therefore not freely available. Reservation triggers and expiry are open. |
| Customer | A person or organization purchasing or intending to purchase products. Guest-account behavior is open. |
| Admin User | A staff identity eligible for Admin Panel access, subject to status and permissions. It is independent from the Customer identity model. |
| Role | A named grouping of permissions assigned to an Admin User. |
| Permission | A granular authorization capability for a protected action or resource. |
| Order | A commercial record representing a customer's requested or completed purchase. Lifecycle is open. |
| Order Item | A line in an Order capturing the selected sellable item, quantity, and transaction-time commercial facts. |
| Authentication Session | One authenticated Admin browser/device session with independently revocable refresh capability. Its final persistence model is open. |
