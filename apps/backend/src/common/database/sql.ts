/**
 * TypeORM's PostgreSQL driver answers `UPDATE`/`DELETE` (with or without `RETURNING`) as `[rows, affectedCount]`, and
 * every other statement (`SELECT`, `INSERT ... RETURNING`) as the rows alone. Destructure accordingly:
 *
 *   const [rows]: Updated<Row> = await manager.query('UPDATE ... RETURNING *');
 *   const [, affected]: Updated = await manager.query('DELETE ...');
 */
export type Updated<Row = unknown> = [Row[], number];
