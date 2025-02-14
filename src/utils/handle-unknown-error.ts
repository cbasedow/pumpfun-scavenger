/**
 * @description Handle an unknown error and return an Error object
 * @param error - The unknown error to handle
 * @returns An Error object
 */
export const handleUnknownError = (error: unknown): Error => {
	if (error instanceof Error) {
		return error;
	}
	return new Error(String(error));
};
