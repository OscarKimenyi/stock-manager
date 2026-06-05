// Convert MySQL DATE_FORMAT to PostgreSQL TO_CHAR
function formatDate(date, format) {
  if (!date) return null;
  return new Date(date).toISOString().split("T")[0];
}

// PostgreSQL query builder for pagination
function buildPaginationQuery(
  baseQuery,
  page,
  limit,
  searchFields = [],
  searchTerm = "",
) {
  let query = baseQuery;
  const params = [];
  let paramIndex = 1;

  if (searchTerm && searchFields.length > 0) {
    const searchConditions = searchFields.map(
      (field) => `${field} ILIKE $${paramIndex++}`,
    );
    query += ` WHERE (${searchConditions.join(" OR ")})`;
    params.push(`%${searchTerm}%`);
  }

  const offset = (page - 1) * limit;
  query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  return { query, params };
}

module.exports = {
  formatDate,
  buildPaginationQuery,
};
