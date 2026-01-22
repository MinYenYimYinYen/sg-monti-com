export function cleanMongoObject<T>(obj: T): Omit<T, "_id" | "__v"> {
  const { _id, __v, createdAt, updatedAt, ...rest } = obj as any;

  const cleaned = { ...rest };

  if (createdAt) {
    cleaned.createdAt =
      createdAt instanceof Date ? createdAt.toISOString() : createdAt;
  }
  if (updatedAt) {
    cleaned.updatedAt =
      updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt;
  }

  return cleaned as Omit<T, "_id" | "__v">;
}

export function cleanMongoArray<T>(arr: T[]): Omit<T, "_id" | "__v">[] {
  return arr.map((obj) => cleanMongoObject(obj));
}
