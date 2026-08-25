export const MAX_COLLECTION_NAME_LENGTH = 100;
export const MAX_COLLECTION_DESCRIPTION_LENGTH = 500;

export interface CollectionFormErrors {
  name?: string;
  description?: string;
}

export function validateCollection(
  name: string,
  description: string,
): CollectionFormErrors {
  const errors: CollectionFormErrors = {};
  const trimmedName = name.trim();

  if (!trimmedName) {
    errors.name = "El nombre de la colección es obligatorio";
  } else if (trimmedName.length > MAX_COLLECTION_NAME_LENGTH) {
    errors.name = `El nombre no puede superar los ${MAX_COLLECTION_NAME_LENGTH} caracteres`;
  }

  if (description.trim().length > MAX_COLLECTION_DESCRIPTION_LENGTH) {
    errors.description = `La descripción no puede superar los ${MAX_COLLECTION_DESCRIPTION_LENGTH} caracteres`;
  }

  return errors;
}
