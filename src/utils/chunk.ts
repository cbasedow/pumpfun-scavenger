/**
 * @description Chunk an array into smaller arrays of a specified size
 * @param arr - The array to chunk
 * @param size - The size of the chunks
 * @returns An array of chunks
 */
export const chunk = <T>(arr: T[], size: number): T[][] => {
	const chunks: T[][] = [];

	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}

	return chunks;
};
