import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import Account from "#models/account";
import Transaction from "#models/transaction";

export default class DebugBalance extends BaseCommand {
	static commandName = "debug:balance";
	static description = "Debug le calcul du solde";

	static options: CommandOptions = {
		startApp: true,
	};

	async run() {
		this.logger.info("🔍 Debugging balance calculation...");

		// Récupérer le compte par défaut
		const account = await Account.query().where("isDefault", true).first();
		if (!account) {
			this.logger.error("Aucun compte trouvé");
			return;
		}

		this.logger.info(`📊 Compte: ${account.name} (ID: ${account.id})`);
		this.logger.info(`   Solde initial: ${account.initialBalance}`);
		this.logger.info(`   Solde actuel en BDD: ${account.balance}`);

		// Calculer les crédits
		const creditsResult = await Transaction.query()
			.where("accountId", account.id)
			.where("type", "credit")
			.sum("amount as total")
			.first();

		// Calculer les débits
		const debitsResult = await Transaction.query()
			.where("accountId", account.id)
			.where("type", "debit")
			.sum("amount as total")
			.first();

		const credits = parseFloat(creditsResult?.$extras?.total) || 0;
		const debitsRaw = parseFloat(debitsResult?.$extras?.total) || 0;
		const debits = Math.abs(debitsRaw);

		this.logger.info("");
		this.logger.info("📈 Calcul des transactions:");
		this.logger.info(`   Somme des crédits: ${credits}`);
		this.logger.info(`   Somme des débits (brut): ${debitsRaw}`);
		this.logger.info(`   Somme des débits (abs): ${debits}`);

		// Calculer le solde
		const initialBalance = parseFloat(String(account.initialBalance)) || 0;
		const calculatedBalance = initialBalance + credits - debits;

		this.logger.info("");
		this.logger.info("💰 Résultat:");
		this.logger.info(`   Formule: ${initialBalance} + ${credits} - ${debits}`);
		this.logger.info(`   Solde calculé: ${calculatedBalance}`);
		this.logger.info(`   Solde en BDD: ${account.balance}`);
		this.logger.info(`   Différence: ${account.balance - calculatedBalance}`);

		// Compter les transactions par type
		const creditCount = await Transaction.query()
			.where("accountId", account.id)
			.where("type", "credit")
			.count("* as total")
			.first();

		const debitCount = await Transaction.query()
			.where("accountId", account.id)
			.where("type", "debit")
			.count("* as total")
			.first();

		this.logger.info("");
		this.logger.info("📊 Statistiques:");
		this.logger.info(
			`   Nombre de crédits: ${creditCount?.$extras?.total || 0}`,
		);
		this.logger.info(`   Nombre de débits: ${debitCount?.$extras?.total || 0}`);

		// Vérifier les montants des débits
		const debitTransactions = await Transaction.query()
			.where("accountId", account.id)
			.where("type", "debit")
			.orderBy("amount", "asc")
			.limit(10);

		this.logger.info("");
		this.logger.info("🔍 Derniers débits (montants):");
		for (const tx of debitTransactions) {
			this.logger.info(
				`   ${tx.date.toSQLDate()} | ${tx.amount} | ${tx.label.substring(0, 40)}`,
			);
		}

		// Proposer de mettre à jour
		this.logger.info("");
		if (Math.abs(account.balance - calculatedBalance) > 0.01) {
			this.logger.warning(
				`⚠️  Différence détectée: ${account.balance - calculatedBalance}`,
			);

			const confirm = await this.prompt.confirm(
				"Voulez-vous mettre à jour le solde en BDD ?",
			);
			if (confirm) {
				account.balance = calculatedBalance;
				await account.save();
				this.logger.success(`✅ Solde mis à jour: ${calculatedBalance}`);
			}
		} else {
			this.logger.success("✅ Le solde est correct!");
		}
	}
}
