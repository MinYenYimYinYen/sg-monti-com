export function cleanMongoObject<T>(obj: T): Omit<T, "_id" | "__v"> {
  const { _id, __v, ...cleanedObj } = obj as any;
  return cleanedObj;
}

export function cleanMongoArray<T>(arr: T[]): Omit<T, "_id" | "__v">[] {
  return arr.map((obj) => cleanMongoObject(obj));
}