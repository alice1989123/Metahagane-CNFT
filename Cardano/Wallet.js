import Loader from "./loader";

export const addressBech32 = async () => {
  await Loader.load();
  const address = (await window.cardano.getUsedAddresses())[0];
  return Loader.Cardano.Address.from_bytes(
    Buffer.from(address, "hex")
  ).to_bech32();
};

export async function signTx_(transaction_) {
  //await Loader.load();
  const transaction = Loader.Cardano.Transaction.from_bytes(
    Buffer.from(transaction_, "hex")
  );
  const witnesses = await window.cardano.signTx(transaction_, true);

  const txWitnesses = transaction.witness_set();
  const txVkeys = txWitnesses.vkeys();
  const txScripts = txWitnesses.native_scripts();

  const addWitnesses = Loader.Cardano.TransactionWitnessSet.from_bytes(
    Buffer.from(witnesses, "hex")
  );
  const addVkeys = addWitnesses.vkeys();
  const addScripts = addWitnesses.native_scripts();

  const totalVkeys = Loader.Cardano.Vkeywitnesses.new();
  const totalScripts = Loader.Cardano.NativeScripts.new();

  if (txVkeys) {
    for (let i = 0; i < txVkeys.len(); i++) {
      totalVkeys.add(txVkeys.get(i));
    }
  }
  if (txScripts) {
    for (let i = 0; i < txScripts.len(); i++) {
      totalScripts.add(txScripts.get(i));
    }
  }
  if (addVkeys) {
    for (let i = 0; i < addVkeys.len(); i++) {
      totalVkeys.add(addVkeys.get(i));
    }
  }
  if (addScripts) {
    for (let i = 0; i < addScripts.len(); i++) {
      totalScripts.add(addScripts.get(i));
    }
  }

  const totalWitnesses = Loader.Cardano.TransactionWitnessSet.new();
  totalWitnesses.set_vkeys(totalVkeys);
  totalWitnesses.set_native_scripts(totalScripts);

  const signedTx = await Loader.Cardano.Transaction.new(
    transaction.body(),
    totalWitnesses,
    transaction.auxiliary_data()
  );
  return signedTx;
}

export async function submitTx(signedTx) {
  try {
    const txHash = await window.cardano.submitTx(
      Buffer.from(signedTx.to_bytes(), "hex").toString("hex")
    );
    return txHash;
  } catch (e) {
    console.log(e);
  }
}
