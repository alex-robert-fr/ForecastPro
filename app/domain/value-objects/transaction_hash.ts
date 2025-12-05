import { createHash } from "node:crypto";

/**
 * Value Object représentant un hash unique de transaction
 * Utilisé pour la détection des doublons
 */
export class TransactionHash {
	private static readonly HASH_LENGTH = 32;
	private readonly _value: string;

	private constructor(value: string) {
		this._value = value;
	}

	get value(): string {
		return this._value;
	}

	/**
	 * Crée un hash à partir des données de transaction
	 */
	static create(
		date: string,
		label: string,
		amount: number,
		uniqueId?: string,
	): TransactionHash {
		const timestamp = uniqueId || Date.now().toString();
		const data = `${date}|${label}|${amount}|${timestamp}`;
		const hash = createHash("sha256")
			.update(data)
			.digest("hex")
			.substring(0, TransactionHash.HASH_LENGTH);
		return new TransactionHash(hash);
	}

	/**
	 * Crée un hash pour une transaction importée (CSV)
	 * Inclut l'index de ligne pour permettre les transactions identiques le même jour
	 */
	static forImport(
		date: string,
		label: string,
		amount: number,
		rowIndex: number,
	): TransactionHash {
		const random = Math.random().toString(36).substring(2, 10);
		const data = `${date}|${label}|${amount}|${rowIndex}|${Date.now()}|${random}`;
		const hash = createHash("sha256")
			.update(data)
			.digest("hex")
			.substring(0, TransactionHash.HASH_LENGTH);
		return new TransactionHash(hash);
	}

	/**
	 * Crée un hash pour une transaction Tink (basé sur l'ID externe)
	 * Déterministe pour éviter les doublons lors des re-syncs
	 */
	static forTink(
		date: string,
		amount: number,
		description: string,
		type: string,
	): TransactionHash {
		const data = `${date}|${amount}|${description}|${type}`;
		const hash = createHash("sha256")
			.update(data)
			.digest("hex")
			.substring(0, TransactionHash.HASH_LENGTH);
		return new TransactionHash(hash);
	}

	/**
	 * Crée un hash pour une transaction manuelle
	 * Inclut un timestamp et un random pour garantir l'unicité
	 */
	static forManual(
		date: string,
		label: string,
		amount: number,
	): TransactionHash {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 10);
		const data = `${date}|${label}|${amount}|${timestamp}|${random}`;
		const hash = createHash("sha256")
			.update(data)
			.digest("hex")
			.substring(0, TransactionHash.HASH_LENGTH);
		return new TransactionHash(hash);
	}

	/**
	 * Reconstruit un TransactionHash depuis une valeur existante
	 */
	static fromString(value: string): TransactionHash {
		if (!value || value.length !== TransactionHash.HASH_LENGTH) {
			throw new Error(
				`Invalid hash value: expected ${TransactionHash.HASH_LENGTH} characters`,
			);
		}
		return new TransactionHash(value);
	}

	equals(other: TransactionHash): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
