//@ts-nocheck

import Loader from "./Loader_";
import { languageViews } from "./LanguageViews.js";
import { assets } from "../constants/assets";

export function toHex(bytes) {
  return Buffer.from(bytes, "hex").toString("hex");
}
export function fromHex(hex) {
  return Buffer.from(hex, "hex");
}

export function HextoAscii(hex) {
  return Buffer.from(hex, "hex").toString("utf-8");
}

export const addressBech32 = async () => {
  await Loader.load();
  const address = (await window.cardano.getUsedAddresses())[0];
  return Loader.Cardano.Address.from_bytes(
    Buffer.from(address, "hex")
  ).to_bech32();
};

export const getSelfUTXOs = async () => {
  await Loader.load();
  const hexUTXOS = await window.cardano.getUtxos();
  const utxos = hexUTXOS.map((x) =>
    Loader.Cardano.TransactionUnspentOutput.from_bytes(fromHex(x))
  );
  return utxos;
};

export async function initTx(protocolParameters) {
  await Loader.load();
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

  return txBuilder;
}

export function getNiceName(nftName) {
  function getLabel(nftName_) {
    const names = assets.map((x) => x.value);
    const index = names.indexOf(nftName_.split(/[0-9]/)[0]);
    const label = assets[index].label;

    return label;
  }
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  if (nftName.replace(/[^0-9]/g, "") == "") {
    return `${getLabel(nftName)}`;
  }

  return `${getLabel(nftName)} #${nftName.replace(/[^0-9]/g, "")} `;
}
