import Loader from "./Loader_";
import { marketScriptAdresssBech32 } from "../constants/marketPLaceAddress";
import { getParams, getUtxos, registerSell } from "../pages/api/server";
import { languageViews } from "./LanguageViews";
import { fromHex } from "../Cardano/Utils";
import CoinSelection from "./CoinSelection";
import { PlutusDataObject } from "./PlutusDataObject.ts";
import { PlutusFieldType } from "./PlutusField.ts";
import { toHex } from "../Cardano/Utils";
import { contract } from "./marketPlaceContract";

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

export async function sell(
  selectedAsset,
  askingPrice //, quantity
) {
  if (selectedAsset.length == 0) {
    console.log("you have not selected an asset to sell");
    return;
  } else {
    if (selectedAsset.quantity !== "1") {
      console.log("This is not an NFT!");
      return;
    }
    await Loader.load();
    const martketAddressbech32 = marketScriptAdresssBech32;
    const marketAddress =
      Loader.Cardano.Address.from_bech32(martketAddressbech32);

    async function initTx(protocolParameters) {
      const txBuilder = Loader.Cardano.TransactionBuilder.new(
        Loader.Cardano.LinearFee.new(
          Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeA),
          Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeB)
        ),
        Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
        Loader.Cardano.BigNum.from_str(protocolParameters.poolDeposit),
        Loader.Cardano.BigNum.from_str(protocolParameters.keyDeposit),
        protocolParameters.maxValSize,
        protocolParameters.maxTxSize,
        protocolParameters.priceMem,
        protocolParameters.priceStep,
        Loader.Cardano.LanguageViews.new(Buffer.from(languageViews, "hex"))
      );
      const datums = Loader.Cardano.PlutusList.new();
      const outputs = Loader.Cardano.TransactionOutputs.new();
      return { txBuilder };
    }

    //console.log(selectedAsset[0]);
    const hexUtxos = await window.cardano.getUtxos();

    //console.log(hexUtxos);

    const utxos = hexUtxos.map((x) =>
      Loader.Cardano.TransactionUnspentOutput.from_bytes(Buffer.from(x, "hex"))
    );

    const protocolParameters = await getParams();

    // console.log(protocolParameters);

    const { txBuilder } = await initTx(protocolParameters);

    const hexAddress = await addressBech32();

    const clientAddress = Loader.Cardano.Address.from_bech32(hexAddress);

    const baseAddress = Loader.Cardano.BaseAddress.from_address(clientAddress);

    const pkh = baseAddress.payment_cred().to_keyhash().to_bytes();
    console.log(Buffer.from(pkh, "hex").toString("hex"));

    const policyId = selectedAsset.unit.slice(0, 56);
    //console.log(policyId);
    const assetNameHex = selectedAsset.unit.slice(56);

    console.log(assetNameHex);

    const assetName = Buffer.from(assetNameHex, "hex").toString("utf8");
    console.log(assetName, Buffer.from(fromHex(assetNameHex), "hex"));

    CoinSelection.setProtocolParameters(
      protocolParameters.minUtxo.toString(),
      protocolParameters.linearFee.minFeeA.toString(),
      protocolParameters.linearFee.minFeeB.toString(),
      protocolParameters.maxTxSize.toString()
    );

    const hoskyDatumObject = OfferDatum(pkh, askingPrice, policyId, assetName);

    //console.log(hoskyDatumObject);

    const datum = await ToPlutusData(hoskyDatumObject);

    const datumHash = Loader.Cardano.hash_plutus_data(datum);

    const outPutValue_ = await amountToValue([
      {
        unit: selectedAsset.unit,
        quantity: selectedAsset.quantity,
      },
    ]);

    const outPutValue = Loader.Cardano.Value.from_bytes(
      //This is needed because amountToValue uses Loader instead of Loader maybe we should just use Custom Loader everywhere instead
      outPutValue_.to_bytes()
    );

    const datumHashBytes = datumHash.to_bytes(); //this is required because ptr changes after it is used
    const min_ada_required = Loader.Cardano.min_ada_required(
      outPutValue,
      Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
      datumHash
    );
    outPutValue.set_coin(min_ada_required);

    const outPut = Loader.Cardano.TransactionOutput.new(
      marketAddress,
      outPutValue
    );

    outPut.set_data_hash(Loader.Cardano.DataHash.from_bytes(datumHashBytes));

    const outPuts = Loader.Cardano.TransactionOutputs.new();
    outPuts.add(outPut);
    let { input, change } = CoinSelection.randomImprove(utxos, outPuts, 8);
    input.forEach((utxo) => {
      txBuilder.add_input(
        utxo.output().address(),
        utxo.input(),
        utxo.output().amount()
      );
    });

    txBuilder.add_output(outPut);

    const transactionWitnessSet = Loader.Cardano.TransactionWitnessSet.new();

    const metadata = {
      0: hexAddress.slice(0, 60),
      1: hexAddress.slice(60),
      2: askingPrice,
    };
    //console.log(metadata);
    const aux_data = Loader.Cardano.AuxiliaryData.new();
    const generalMetadata = Loader.Cardano.GeneralTransactionMetadata.new();

    Object.keys(metadata).forEach((label) => {
      generalMetadata.insert(
        Loader.Cardano.BigNum.from_str(label),
        Loader.Cardano.encode_json_str_to_metadatum(
          JSON.stringify(metadata[label]),
          1
        )
      );
    });

    aux_data.set_metadata(generalMetadata);
    txBuilder.set_auxiliary_data(aux_data);

    txBuilder.add_change_if_needed(clientAddress);

    const txBody = txBuilder.build();

    const tx = Loader.Cardano.Transaction.new(
      txBody,
      Loader.Cardano.TransactionWitnessSet.new(),
      aux_data
    );
    const size = tx.to_bytes().length * 2;
    console.log(size);
    if (size > protocolParameters.maxTxSize)
      throw new Error("MAX_SIZE_REACHED");

    console.log(toHex(tx.to_bytes()));
    let txVkeyWitnesses = await window.cardano.signTx(
      toHex(tx.to_bytes()),
      true
    );
    console.log(toHex(tx.to_bytes()));
    txVkeyWitnesses = Loader.Cardano.TransactionWitnessSet.from_bytes(
      fromHex(txVkeyWitnesses)
    );
    transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());
    const signedTx = Loader.Cardano.Transaction.new(
      tx.body(),
      transactionWitnessSet,
      tx.auxiliary_data()
    );

    console.log("Full Tx Size", signedTx.to_bytes().length);

    const txHash = await window.cardano.submitTx(toHex(signedTx.to_bytes()));
    console.log(
      `Your item has been listened at sale for a price of ${askingPrice}`
    );
    return txHash;
  }
}

const OfferDatum = (pkh, askingPrice, policyId, assetName) => {
  const offerDatum = new PlutusDataObject(0);
  offerDatum.Fields = [
    {
      Index: 0,
      Type: PlutusFieldType.Bytes,
      Key: "pkh",
      Value: pkh,
    },
    {
      Index: 0,
      Type: PlutusFieldType.Integer,
      Key: "price",
      Value: askingPrice,
    },
    {
      Index: 0,
      Type: PlutusFieldType.Bytes,
      Key: "policyId",
      Value: fromHex(policyId),
    },
    {
      Index: 0,
      Type: PlutusFieldType.Bytes,
      Key: "assetName",
      Value: Buffer.from(assetName, "utf8"),
    },
  ];
  return offerDatum;
};

const ToPlutusData = async (plutusDataObj) => {
  await Loader.load();
  const datumFields = Loader.Cardano.PlutusList.new();
  plutusDataObj.Fields.sort((a, b) => a.Index - b.Index);
  plutusDataObj.Fields.forEach((f) => {
    switch (f.Type) {
      case PlutusFieldType.Integer:
        datumFields.add(
          Loader.Cardano.PlutusData.new_integer(
            Loader.Cardano.BigInt.from_str(f.Value.toString())
          )
        );
        break;
      // case PlutusFieldType.Data:
      //     datumFields.add(ToPlutusData(f.Value) as PlutusData);
      case PlutusFieldType.Bytes:
        datumFields.add(Loader.Cardano.PlutusData.new_bytes(f.Value));
    }
  });

  return Loader.Cardano.PlutusData.new_constr_plutus_data(
    Loader.Cardano.ConstrPlutusData.new(
      Loader.Cardano.Int.new_i32(plutusDataObj.ConstructorIndex),
      datumFields
    )
  );
};

const amountToValue = async (assets) => {
  //await Loader.load();
  const multiAsset = Loader.Cardano.MultiAsset.new();
  const lovelace = assets.find((asset) => asset.unit === "lovelace");
  const policies = [
    ...new Set(
      assets
        .filter((asset) => asset.unit !== "lovelace")
        .map((asset) => asset.unit.slice(0, 56))
    ),
  ];
  policies.forEach((policy) => {
    const policyAssets = assets.filter(
      (asset) => asset.unit.slice(0, 56) === policy
    );
    const assetsValue = Loader.Cardano.Assets.new();
    policyAssets.forEach((asset) => {
      assetsValue.insert(
        Loader.Cardano.AssetName.new(Buffer.from(asset.unit.slice(56), "hex")),
        Loader.Cardano.BigNum.from_str(asset.quantity)
      );
    });
    multiAsset.insert(
      Loader.Cardano.ScriptHash.from_bytes(Buffer.from(policy, "hex")),
      assetsValue
    );
  });
  const value = Loader.Cardano.Value.new(
    Loader.Cardano.BigNum.from_str(lovelace ? lovelace.quantity : "0")
  );
  if (assets.length > 1 || !lovelace) value.set_multiasset(multiAsset);
  return value;
};

export async function CancelSell(asset) {
  await Loader.load();
  const askingPrice = asset.price * 1000000;
  const martketAddressbech32 = marketScriptAdresssBech32;
  const marketAddress =
    Loader.Cardano.Address.from_bech32(martketAddressbech32);

  async function initTx(protocolParameters) {
    const txBuilder = Loader.Cardano.TransactionBuilder.new(
      Loader.Cardano.LinearFee.new(
        Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeA),
        Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeB)
      ),
      Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
      Loader.Cardano.BigNum.from_str(protocolParameters.poolDeposit),
      Loader.Cardano.BigNum.from_str(protocolParameters.keyDeposit),
      protocolParameters.maxValSize,
      protocolParameters.maxTxSize,
      protocolParameters.priceMem,
      protocolParameters.priceStep,
      Loader.Cardano.LanguageViews.new(Buffer.from(languageViews, "hex"))
    );

    return { txBuilder };
  }

  async function getUtxoNFT(asset, marketAddress) {
    if (!(asset.quantity == 1)) {
      //console.log(asset);
      console.log("this is not an NFT!");
    }

    const utxos = await getUtxos(marketAddress);
    //console.log(utxos);

    const stringutxos = utxos.map((x) => JSON.stringify(x));

    const filteredstring = stringutxos.filter((x) =>
      x.includes(`${asset.unit}`)
    );
    const selectedUtox = JSON.parse(filteredstring);

    const valueutxo = await assetsToValue_(selectedUtox.amount);

    const inpututxo = Loader.Cardano.TransactionInput.new(
      Loader.Cardano.TransactionHash.from_bytes(
        Buffer.from(selectedUtox.tx_hash, "hex")
      ),
      selectedUtox.tx_index
    );

    const outpututxo = Loader.Cardano.TransactionOutput.new(
      Loader.Cardano.Address.from_bech32(marketAddress),
      valueutxo
    );

    const utxoNFT = Loader.Cardano.TransactionUnspentOutput.new(
      inpututxo,
      outpututxo
    );

    return utxoNFT;
  }

  const scriptUtxo = await getUtxoNFT(asset, martketAddressbech32);

  const dummy_inputDAtaHash = // TODO: Check about it! Is it nedeed?
    "be01a7c9cd7b5982ea98022cac268913311a5a98ad6a37b3d67f1bf918b7b8e8";
  const protocolParameters = await getParams();

  //console.log(protocolParameters);

  const { txBuilder } = await initTx(protocolParameters);

  const hexAddress = await addressBech32();

  const clientAddress = Loader.Cardano.Address.from_bech32(hexAddress);

  const baseAddress = Loader.Cardano.BaseAddress.from_address(clientAddress);

  const pkh = baseAddress.payment_cred().to_keyhash().to_bytes();
  console.log(Buffer.from(pkh, "hex").toString("hex"));
  const assetNameHex = asset.unit.slice(56);
  const assetName = Buffer.from(assetNameHex, "hex").toString("utf8");

  const policyId = asset.unit.slice(0, 56);

  const unit = policyId + assetNameHex;
  console.log(unit);

  const nfTValue = await assetsToValue_([
    { unit: asset.unit, quantity: asset.quantity },
  ]);

  //nfTValue.set_coin(Loader.Cardano.BigNum.from_str("1851850"));
  //console.log(  nfTValue);

  const nfTValueBytes = nfTValue.to_bytes();

  const min_ada_required = Loader.Cardano.min_ada_required(
    Loader.Cardano.Value.from_bytes(nfTValueBytes),
    Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
    Loader.Cardano.DataHash.from_bytes(Buffer.from(dummy_inputDAtaHash, "hex"))
  );
  //console.log(nfTValueBytes);

  const utxos = (await window.cardano.getUtxos()).map((utxo) =>
    Loader.Cardano.TransactionUnspentOutput.from_bytes(fromHex(utxo))
  );

  const outPut = Loader.Cardano.TransactionOutput.new(
    clientAddress,
    Loader.Cardano.Value.from_bytes(nfTValueBytes).checked_add(
      Loader.Cardano.Value.new(min_ada_required)
    )
  );
  console.log(pkh, askingPrice, policyId, assetName);
  const hoskyDatumObject = OfferDatum(pkh, askingPrice, policyId, assetName);
  console.log(hoskyDatumObject);

  const datum = await ToPlutusData(hoskyDatumObject);

  console.log(Buffer.from(datum.to_bytes(), "hex").toString("hex"));

  const datumHash = Loader.Cardano.hash_plutus_data(datum);

  console.log(datumHash);

  console.log(Buffer.from(datum.to_bytes(), "hex").toString("hex"));

  const datumList = Loader.Cardano.PlutusList.new();
  datumList.add(datum);
  const outPuts = Loader.Cardano.TransactionOutputs.new();
  outPuts.add(outPut);

  CoinSelection.setProtocolParameters(
    protocolParameters.minUtxo.toString(),
    protocolParameters.linearFee.minFeeA.toString(),
    protocolParameters.linearFee.minFeeB.toString(),
    protocolParameters.maxTxSize.toString()
  );

  let { input, change, remaining } = CoinSelection.randomImprove(
    utxos,
    outPuts,
    8,
    [scriptUtxo]
  );

  input.forEach((utxo) => {
    txBuilder.add_input(
      utxo.output().address(),
      utxo.input(),
      utxo.output().amount()
    );
  });

  txBuilder.add_output(outPut);

  const redeemers = Loader.Cardano.Redeemers.new();
  // not passing datum because close.json content is {"constructor":2,"fields":[]}

  const SimpleRedeemer = async (index) => {
    //close.json - {"constructor":2,"fields":[]} - this is why I pyt new_i32(2), maybe I'm wrong here
    const redeemerData = Loader.Cardano.PlutusData.new_constr_plutus_data(
      Loader.Cardano.ConstrPlutusData.new(
        Loader.Cardano.Int.new_i32(2),
        Loader.Cardano.PlutusList.new()
      )
    );

    const r = Loader.Cardano.Redeemer.new(
      Loader.Cardano.RedeemerTag.new_spend(),
      Loader.Cardano.BigNum.from_str(index),
      redeemerData,
      Loader.Cardano.ExUnits.new(
        Loader.Cardano.BigNum.from_str("7000000"),
        Loader.Cardano.BigNum.from_str("3000000000")
      )
    );

    return r;
  };

  const scriptUtxoIndex = txBuilder
    .index_of_input(scriptUtxo.input())
    .toString();

  redeemers.add(await SimpleRedeemer(scriptUtxoIndex));

  const scripts = Loader.Cardano.PlutusScripts.new();
  scripts.add(Loader.Cardano.PlutusScript.new(fromHex(contract.cborHex)));

  const transactionWitnessSet = Loader.Cardano.TransactionWitnessSet.new();

  txBuilder.set_plutus_scripts(scripts);
  console.log(scripts);
  txBuilder.set_plutus_data(datumList);
  console.log(datumList);

  txBuilder.set_redeemers(redeemers);
  console.log(redeemers);

  transactionWitnessSet.set_plutus_scripts(scripts);
  console.log(scripts);

  transactionWitnessSet.set_plutus_data(datumList);
  console.log(datumList);

  transactionWitnessSet.set_redeemers(redeemers);
  console.log(redeemers);

  // console.log(utxos, input, change, remaining);

  const collateralHex = await window.cardano.getCollateral();

  if (collateralHex.length === 0) {
    console.log("there is not collaterals for this transaction");
    window.alert(
      "Your transaction has not been submited, in order to list your item, provide some collateral in the Nami Wallet configuration."
    );
    return;
  }

  const collateral = Loader.Cardano.TransactionUnspentOutput.from_bytes(
    Buffer.from(collateralHex[0], "Hex")
  );

  const collaterals = Loader.Cardano.TransactionInputs.new();

  console.log(collateral.input());
  collaterals.add(collateral.input());

  const requiredSigners = Loader.Cardano.Ed25519KeyHashes.new();
  requiredSigners.add(baseAddress.payment_cred().to_keyhash());
  txBuilder.set_required_signers(requiredSigners);
  txBuilder.set_collateral(collaterals);
  txBuilder.add_change_if_needed(clientAddress);

  const txBody = txBuilder.build();
  const tx = Loader.Cardano.Transaction.new(
    txBody,
    transactionWitnessSet,
    txBody.auxiliary_data
  );
  const size = tx.to_bytes().length * 2;
  console.log(size);
  //if (size > protocolParameters.maxTxSize) throw new Error("MAX_SIZE_REACHED");
  console.log(toHex(tx.to_bytes()));

  let txVkeyWitnesses = await window.cardano.signTx(toHex(tx.to_bytes()), true);
  txVkeyWitnesses = Loader.Cardano.TransactionWitnessSet.from_bytes(
    fromHex(txVkeyWitnesses)
  );
  transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());
  const signedTx = Loader.Cardano.Transaction.new(
    tx.body(),
    transactionWitnessSet,
    tx.auxiliary_data()
  );

  console.log("Full Tx Size", signedTx.to_bytes().length);

  try {
    const txHash = await window.cardano.submitTx(toHex(signedTx.to_bytes()));
    console.log(
      `Your item has been de-listed from the market place with transaction is ${txHash}`
    );
    return txHash;
  } catch (e) {
    console.log(e);
  }
}

export async function assetsToValue_(assets) {
  await Loader.load();
  const multiAsset = Loader.Cardano.MultiAsset.new();
  const lovelace = assets.find((asset) => asset.unit === "lovelace");
  const policies = [
    ...new Set(
      assets
        .filter((asset) => asset.unit !== "lovelace")
        .map((asset) => asset.unit.slice(0, 56))
    ),
  ];
  policies.forEach((policy) => {
    const policyAssets = assets.filter(
      (asset) => asset.unit.slice(0, 56) === policy
    );
    const assetsValue = Loader.Cardano.Assets.new();
    policyAssets.forEach((asset) => {
      assetsValue.insert(
        Loader.Cardano.AssetName.new(Buffer.from(asset.unit.slice(56), "hex")),
        Loader.Cardano.BigNum.from_str(asset.quantity)
      );
    });
    multiAsset.insert(
      Loader.Cardano.ScriptHash.from_bytes(Buffer.from(policy, "hex")),
      assetsValue
    );
  });
  const value = Loader.Cardano.Value.new(
    Loader.Cardano.BigNum.from_str(lovelace ? lovelace.quantity : "0")
  );
  if (assets.length > 1 || !lovelace) value.set_multiasset(multiAsset);
  return value;
}

export async function BuyNFT(asset) {
  await Loader.load();

  const askingPrice = asset.price;

  const marketPkhStr =
    "dca6035712f164db2f99c71404d392115d2bdde366fbbe359ae01f1d";

  const paymentvKeyMarrket = Loader.Cardano.StakeCredential.from_keyhash(
    //TODO: check how to get an address that works!
    Loader.Cardano.Ed25519KeyHash.from_bytes(Buffer.from(marketPkhStr, "hex"))
  );

  const marketAddress =
    "addr_test1qrw2vq6hztckfke0n8r3gpxnjgg4627audn0h034ntsp78thnae0km53d08p2paq2kp524nxkzzja099utujetdz867qpf8p9s"; //  Dummy market address

  const sellerAddressBech32 = asset.address;
  const scriptAddressBech32 = marketScriptAdresssBech32;
  const scriptAddress = Loader.Cardano.Address.from_bech32(scriptAddressBech32);

  const sellerAddress = Loader.Cardano.Address.from_bech32(sellerAddressBech32);

  async function initTx(protocolParameters) {
    const txBuilder = Loader.Cardano.TransactionBuilder.new(
      Loader.Cardano.LinearFee.new(
        Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeA),
        Loader.Cardano.BigNum.from_str(protocolParameters.linearFee.minFeeB)
      ),
      Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
      Loader.Cardano.BigNum.from_str(protocolParameters.poolDeposit),
      Loader.Cardano.BigNum.from_str(protocolParameters.keyDeposit),
      protocolParameters.maxValSize,
      protocolParameters.maxTxSize,
      protocolParameters.priceMem,
      protocolParameters.priceStep,
      Loader.Cardano.LanguageViews.new(Buffer.from(languageViews, "hex"))
    );

    return { txBuilder };
  }

  async function getUtxoNFT(asset, marketAddress) {
    if (!(asset.quantity == 1)) {
      console.log("this is not an NFT!");
      return;
    }

    const utxos = await getUtxos(marketAddress);

    const stringutxos = utxos.map((x) => JSON.stringify(x));
    const filteredstring = stringutxos.filter((x) =>
      x.includes(`${asset.unit}`)
    );
    const selectedUtox = JSON.parse(filteredstring);

    const valueutxo = await assetsToValue_(selectedUtox.amount);

    const inpututxo = Loader.Cardano.TransactionInput.new(
      Loader.Cardano.TransactionHash.from_bytes(
        Buffer.from(selectedUtox.tx_hash, "hex")
      ),
      selectedUtox.tx_index
    );

    const outpututxo = Loader.Cardano.TransactionOutput.new(
      Loader.Cardano.Address.from_bech32(marketAddress),
      valueutxo
    );

    const utxoNFT = Loader.Cardano.TransactionUnspentOutput.new(
      inpututxo,
      outpututxo
    );

    return utxoNFT;
  }

  const scriptUtxo = await getUtxoNFT(asset, scriptAddressBech32);

  const dummy_inputDAtaHash = // TODO: Check about it! Is it nedeed?
    "be01a7c9cd7b5982ea98022cac268913311a5a98ad6a37b3d67f1bf918b7b8e8";
  const protocolParameters = await getParams();

  // console.log(protocolParameters);

  const { txBuilder } = await initTx(protocolParameters);

  const hexAddress = await addressBech32();

  const clientAddress = Loader.Cardano.Address.from_bech32(hexAddress);

  const sellerbaseAddress =
    Loader.Cardano.BaseAddress.from_address(sellerAddress);

  const pkh = sellerbaseAddress.payment_cred().to_keyhash().to_bytes();
  console.log(Buffer.from(pkh, "hex").toString("hex"));
  const assetNameHex = asset.unit.slice(56);
  const assetName = Buffer.from(assetNameHex, "hex").toString("utf8");

  const policyId = asset.unit.slice(0, 56);

  const unit = policyId + assetNameHex;
  console.log(unit);

  const nfTValue = await assetsToValue_([
    { unit: asset.unit, quantity: asset.quantity },
  ]);

  //nfTValue.set_coin(Loader.Cardano.BigNum.from_str("1851850"));
  //console.log(nfTValue);

  const nfTValueBytes = nfTValue.to_bytes();

  const min_ada_required = Loader.Cardano.min_ada_required(
    Loader.Cardano.Value.from_bytes(nfTValueBytes),
    Loader.Cardano.BigNum.from_str(protocolParameters.minUtxo),
    Loader.Cardano.DataHash.from_bytes(Buffer.from(dummy_inputDAtaHash, "hex"))
  );
  //console.log(nfTValueBytes);

  const utxos = (await window.cardano.getUtxos()).map((utxo) =>
    Loader.Cardano.TransactionUnspentOutput.from_bytes(fromHex(utxo))
  );

  const NFToutPut = Loader.Cardano.TransactionOutput.new(
    clientAddress,
    Loader.Cardano.Value.from_bytes(nfTValueBytes).checked_add(
      Loader.Cardano.Value.new(min_ada_required)
    )
  );

  //console.log(askingPrice);

  const sellerOutPut = Loader.Cardano.TransactionOutput.new(
    sellerAddress,

    Loader.Cardano.Value.new(Loader.Cardano.BigNum.from_str(`${askingPrice}`))
  );

  /*   const marketOutPut = Loader.Cardano.TransactionOutput.new( //TODO: for now wer are not paying fees!! check
    Loader.Cardano.Address.from_bech32(marketAddress),
    Loader.Cardano.Value.new(
      Loader.Cardano.BigNum.from_str("10000000")
    )
  ); */

  // DATUM

  const hoskyDatumObject = OfferDatum(pkh, askingPrice, policyId, assetName);

  //console.log(hoskyDatumObject);

  const datum = await ToPlutusData(hoskyDatumObject);

  console.log(Buffer.from(datum.to_bytes(), "hex").toString("hex"));

  const datumHash = Loader.Cardano.hash_plutus_data(datum);

  console.log(datumHash);

  console.log(Buffer.from(datum.to_bytes(), "hex").toString("hex"));

  const datumList = Loader.Cardano.PlutusList.new();
  datumList.add(datum);
  const outPuts = Loader.Cardano.TransactionOutputs.new();
  outPuts.add(NFToutPut);
  outPuts.add(sellerOutPut);
  //outPuts.add(marketOutPut); TODO: MAKE THIS WORK!

  CoinSelection.setProtocolParameters(
    protocolParameters.minUtxo.toString(),
    protocolParameters.linearFee.minFeeA.toString(),
    protocolParameters.linearFee.minFeeB.toString(),
    protocolParameters.maxTxSize.toString()
  );

  let { input, change, remaining } = CoinSelection.randomImprove(
    utxos,
    outPuts,
    8,
    [scriptUtxo]
  );

  input.forEach((utxo) => {
    txBuilder.add_input(
      utxo.output().address(),
      utxo.input(),
      utxo.output().amount()
    );
  });

  txBuilder.add_output(NFToutPut);
  txBuilder.add_output(sellerOutPut);
  //txBuilder.add_output(marketOutPut);  TODO: MAKE THIS WORK!

  const redeemers = Loader.Cardano.Redeemers.new();

  const SimpleRedeemer = async (index) => {
    const redeemerData = Loader.Cardano.PlutusData.new_constr_plutus_data(
      Loader.Cardano.ConstrPlutusData.new(
        Loader.Cardano.Int.new_i32(0),
        Loader.Cardano.PlutusList.new()
      )
    );

    const r = Loader.Cardano.Redeemer.new(
      Loader.Cardano.RedeemerTag.new_spend(),
      Loader.Cardano.BigNum.from_str(index),
      redeemerData,
      Loader.Cardano.ExUnits.new(
        Loader.Cardano.BigNum.from_str("7000000"),
        Loader.Cardano.BigNum.from_str("3000000000")
      )
    );

    return r;
  };

  const scriptUtxoIndex = txBuilder
    .index_of_input(scriptUtxo.input())
    .toString();

  const redeemer = await SimpleRedeemer(scriptUtxoIndex);
  console.log(Buffer.from(redeemer.to_bytes(), "hex").toString("hex"));
  redeemers.add(redeemer);

  const scripts = Loader.Cardano.PlutusScripts.new();
  scripts.add(Loader.Cardano.PlutusScript.new(fromHex(contract.cborHex)));

  const transactionWitnessSet = Loader.Cardano.TransactionWitnessSet.new();

  txBuilder.set_plutus_scripts(scripts);
  console.log(scripts);
  txBuilder.set_plutus_data(datumList);
  console.log(datumList);

  txBuilder.set_redeemers(redeemers);
  console.log(redeemers);

  transactionWitnessSet.set_plutus_scripts(scripts);
  console.log(scripts);

  transactionWitnessSet.set_plutus_data(datumList);
  console.log(datumList);

  transactionWitnessSet.set_redeemers(redeemers);
  console.log(redeemers);

  // console.log(utxos, input, change, remaining);

  const collateralHex = await window.cardano.getCollateral();

  if (collateralHex.length === 0) {
    console.log("there is not collaterals for this transaction");
    window.alert(
      "Your transaction has not been submited, in order to list your item, provide some collateral in the Nami Wallet configuration."
    );
    return;
  }

  const collateral = Loader.Cardano.TransactionUnspentOutput.from_bytes(
    Buffer.from(collateralHex[0], "Hex")
  );

  const collaterals = Loader.Cardano.TransactionInputs.new();

  console.log(collateral.input());
  collaterals.add(collateral.input());

  const requiredSigners = Loader.Cardano.Ed25519KeyHashes.new(); // No required signers needed for buying
  requiredSigners.add(
    Loader.Cardano.BaseAddress.from_address(clientAddress)
      .payment_cred()
      .to_keyhash()
  );
  txBuilder.set_required_signers(requiredSigners);
  txBuilder.set_collateral(collaterals);
  txBuilder.add_change_if_needed(clientAddress);

  const txBody = txBuilder.build();
  const tx = Loader.Cardano.Transaction.new(
    txBody,
    transactionWitnessSet,
    txBody.auxiliary_data
  );
  const size = tx.to_bytes().length * 2;
  console.log(size);
  if (size > protocolParameters.maxTxSize) throw new Error("MAX_SIZE_REACHED");
  console.log(toHex(tx.to_bytes()));

  let txVkeyWitnesses = await window.cardano.signTx(toHex(tx.to_bytes()), true);
  txVkeyWitnesses = Loader.Cardano.TransactionWitnessSet.from_bytes(
    fromHex(txVkeyWitnesses)
  );
  transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());
  const signedTx = Loader.Cardano.Transaction.new(
    tx.body(),
    transactionWitnessSet,
    tx.auxiliary_data()
  );

  console.log("Full Tx Size", signedTx.to_bytes().length);

  try {
    const txHash = await window.cardano.submitTx(toHex(signedTx.to_bytes()));
    const registration = await registerSell(txHash);
    console.log(
      `Your item has been listed for sale with a price of ${askingPrice} Ada,  The transaction Hash for  the listing transaction is ${txHash}`
    );
    return txHash;
  } catch (e) {
    console.log(e);
  }
}
