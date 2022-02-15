import { materials } from "../constants/assets.js";

import Loader from "./Loader_";
import { languageViews } from "./LanguageViews.js";
import { assets } from "../constants/assets";
import { policysId } from "../constants/policyId";

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
  try {
    await Loader.load();

    const address = (await window.cardano.getUsedAddresses())[0];
    return Loader.Cardano.Address.from_bytes(
      Buffer.from(address, "hex")
    ).to_bech32();
  } catch (e) {
    console.log(e);
  }
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
    try {
      const names = assets.map((x) => x.value);
      const index = names.indexOf(nftName_.split(/[0-9]/)[0]);
      const label = assets[index].label;

      return label;
    } catch (e) {
      console.log(e);
      return " ";
    }
  }
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  if (nftName.replace(/[^0-9]/g, "") == "") {
    return `${getLabel(nftName)}`;
  }

  return `${getLabel(nftName)} #${nftName.replace(/[^0-9]/g, "")} `;
}

export async function loadCardano(stateSeter) {
  try {
    const cardanoProvider = await window.cardano;
    if (cardanoProvider) {
      try {
        const cardanoProvider_ = await window.cardano.enable();
        stateSeter(cardanoProvider_);
      } catch (e) {
        stateSeter(false);
        console.log(e);
      }
    } else {
      stateSeter(false);
      console.log("there is no Cardano provider");
    }
  } catch (e) {
    console.log(e);
  }
}

export function isNFTlegit(nft) {
  try {
    if (policysId.includes(nft.slice(0, 56))) {
      return true;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
}
export const isRecipeComplete_ = function (assetsToBurn, asset) {
  function materialCounter(assetsToBurn, material) {
    if (assetsToBurn) {
      console.log(assetsToBurn);

      const filteredAssets = assetsToBurn.filter(
        (x) =>
          fromHex(x.asset.slice(56)).toString().replace(/\d+/g, "") ==
          material.value
      );
      return filteredAssets.length;
    } else {
      return 0;
    }
  }

  const selectedRecipeData = asset.recipe;
  // const selectedAssetsData = []
  //console.log(selectedRecipeData);
  let selectedAssetData = [];
  materials.forEach((material) => {
    const count = materialCounter(assetsToBurn, material);
    selectedAssetData.push(count);
  });
  console.log(selectedAssetData, selectedRecipeData);
  return (
    JSON.stringify(selectedRecipeData) == JSON.stringify(selectedAssetData)
  );
};
