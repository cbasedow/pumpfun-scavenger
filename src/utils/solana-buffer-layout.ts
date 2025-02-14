import { type Layout, blob } from "@solana/buffer-layout";

export const bigInt =
	(byteSize: number) =>
	(property?: string): Layout<bigint> => {
		const layout = blob(byteSize, property);

		const bigIntLayout = layout as Layout<unknown> as Layout<bigint>;

		bigIntLayout.decode = (buffer: Buffer, offset: number) => {
			const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
			switch (byteSize) {
				case 8:
					return view.getBigUint64(0, true);
				case 4:
					return BigInt(view.getUint32(0, true));
				case 2:
					return BigInt(view.getUint16(0, true));
				case 1:
					return BigInt(view.getUint8(0));
				default:
					throw new Error(`Unsupported byte size: ${byteSize}`);
			}
		};

		bigIntLayout.encode = (num: bigint, buffer: Buffer, offset: number) => {
			const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
			switch (byteSize) {
				case 8:
					view.setBigUint64(0, num, true);
					break;
				case 4:
					view.setUint32(0, Number(num), true);
					break;
				case 2:
					view.setUint16(0, Number(num), true);
					break;
				case 1:
					view.setUint8(0, Number(num));
					break;
				default:
					throw new Error(`Unsupported byte size: ${byteSize}`);
			}
			return byteSize;
		};

		return bigIntLayout;
	};

export const u64 = bigInt(8);
export const u32 = bigInt(4);
export const u16 = bigInt(2);
export const u8 = bigInt(1);

export const bool = (property?: string): Layout<boolean> => {
	const layout = blob(1, property);

	const boolLayout = layout as Layout<unknown> as Layout<boolean>;

	boolLayout.decode = (buffer: Buffer, offset: number) => {
		const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
		return view.getUint8(0) === 1;
	};

	boolLayout.encode = (value: boolean, buffer: Buffer, offset: number) => {
		const view = new DataView(buffer.buffer, buffer.byteOffset + offset);
		view.setUint8(0, value ? 1 : 0);
		return 1; // 1 byte written
	};

	return boolLayout;
};
