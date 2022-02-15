//@ts-nocheck

import { assets } from "../../constants/assets.js";
import { useState, useEffect } from "react";
import axios from "axios";
import { INFURA } from "../../constants/routes";
import { addressBech32, fromHex, loadCardano } from "../../Cardano/Utils";
import { forgeWeapon } from "../api/server";
import ConfirmationModal from "../../Components/confirmationModal";
import CardanoModal from "../../Components/CardanoModal.jsx";
import { isRecipeComplete_, isNFTlegit } from "../../Cardano/Utils";
import { selector } from "../../constants/selector.js";

const server = process.env.NEXT_PUBLIC_SERVER_API;

function getAssetsPaths() {
  const FilteredAssets = assets.filter((x) => x.recipe);

  return FilteredAssets.map((x) => {
    return {
      params: {
        id: x.value,
      },
    };
  });
}

export function getPostData(id) {
  const selectedAsset = assets.filter((x) => x.value == id);

  // Combine the data with the id
  return {
    id,
    ...{ selectedAsset: selectedAsset },
  };
}

export default function Craft({ postData }) {
  const [selectedNFTs, setSelectedNFTs] = useState([]);
  const [assetsToBurn, setAssetstoButn] = useState([]);
  const [NFTs, setNFTs] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");
  const [isRecipeComplete, setIsRecipeComplete] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isCardano, setIsCardano] = useState(true);

  useEffect(async () => {
    await loadCardano(setIsCardano);
    await loadNFTs();
  }, []);

  useEffect(() => {
    loadNFTs();
  }, [isCardano]);

  useEffect(() => {
    //console.log(asset);
    setIsRecipeComplete(isRecipeComplete_(assetsToBurn, asset));
    console.log(isRecipeComplete), [assetsToBurn];
  });

  async function loadNFTs() {
    if (window.cardano) {
      await window.cardano.enable();
    }

    const address = await addressBech32();

    const getAssets = async function () {
      // This function trows an error 404 if the address has not had any tx...  FIX!!!
      try {
        const response = await axios.post(`${server}/api/assetss`, {
          address: address,
        });
        const assets = response.data.amount.map((x) => x.unit);

        return assets;
      } catch (error) {
        console.log(error.response);
        return null;
      }
    };
    let data = await getAssets();
    data = data.filter(
      (x) =>
        !!selector(
          Buffer.from(x.slice(56, 100), "hex")
            .toString("utf-8")
            .replace(/[0-9]/g, "")
        )
    );

    data = data.filter((x) => isNFTlegit(x));
    if (!data) {
      setLoadingState("loaded");
    } else {
      //console.log(data)

      const data2 = await Promise.all(
        data.map(
          async (x) =>
            await axios.post(`${server}/api/assetss/info`, {
              asset: x,
            })
        )
      );
      let filteredMetadata_ = data2.filter((x) => true);
      let filteredMetadata = filteredMetadata_.map((x) => x.data);

      const assets = data2.map((x) => x.data.asset);

      console.log(filteredMetadata);

      setNFTs(filteredMetadata);
      setSelectedNFTs(filteredMetadata);

      setLoadingState("loaded");
    }
  }
  const asset = postData.selectedAsset[0];
  console.log(postData);
  console.log(asset);

  const NFTWrapper = function ({ nft, index }) {
    const borderWidth = "border-4 md:2 sm:1";
    //console.log(index)

    function selectedcardsClassName1(nft, assetsToBurn) {
      if (assetsToBurn && assetsToBurn.includes(nft)) {
        return ` ${borderWidth}  border-red-600`;
      } else return null;
    }

    function selectedcardsClassName2(nft, assetsToBurn) {
      if (assetsToBurn && assetsToBurn.includes(nft)) {
        return `${borderWidth} border-lime-600`;
      } else return null;
    }

    return (
      <div
        onClick={() => {
          if (!assetsToBurn.includes(nft)) {
            setAssetstoButn([nft, ...assetsToBurn]);
          }
          if (assetsToBurn.includes(nft)) {
            setAssetstoButn(assetsToBurn.filter((x) => x !== nft));
          }
          console.log(nft.asset, index);
        }}
        id={`${index} ${nft.asset}`}
        className="transition duration-500 hover:scale-110 relative rounded overflow-hidden m-1"
      >
        <img
          className={
            isRecipeComplete
              ? `  sm:h-90 rounded object-cover ${borderWidth} ${selectedcardsClassName2(
                  nft,
                  assetsToBurn
                )}`
              : `  sm:h-90 rounded object-cover ${borderWidth}  ${selectedcardsClassName1(
                  nft,
                  assetsToBurn
                )}`
          }
          src={
            nft.onchain_metadata.image &&
            `${INFURA}${nft.onchain_metadata.image.replace("ipfs://", "ipfs/")}`
          }
          alt="title"
          key={`${index}card-image`}
        />
      </div>
    );
  };

  return (
    <>
      <CardanoModal showModal={!isCardano} />

      <ConfirmationModal
        showModal={showModal}
        setShowModal={setShowModal}
        title={"Transaction succesfull"}
        description={
          "Your Item will be available in your inventory in a few minutes."
        }
      />
      <section className=" hero-section relative mt-2 pt-32 pb-20 lg:pt-48 lg:pb-32 ">
        <div className="  container mx-auto relative px-4 z-10 flex flex-row px-4 z-10  min-h-[46rem]">
          <div className=" basis-2/6 transition duration-500 hover:shadow-sm rounded p-5 ">
            <div className="container  max-h-96	 relative px-4 z-10">
              <div>
                <h2 className="text-center font-display text-xl lg:text-4xl text-blueGray-900 font-bold mb-6 ">
                  Inventory
                </h2>
              </div>
              <div className="grid  grid-cols-3 md: grid grid-cols-2   overflow-y-auto max-h-[36rem]	p-2			">
                {selectedNFTs.map((NFT, key) => (
                  <NFTWrapper key={key} nft={NFT} index={key}></NFTWrapper>
                ))}
              </div>
            </div>
          </div>
          <div className="  basis-3/6 transition duration-500 hover:shadow-sm rounded p-5">
            <div className="container flex mx-auto relative pt-6 px-4 mb-4 z-10">
              <div className="container flex justify-center	">
                <h2 className=" text-center font-display text-xl lg:text-4xl text-blueGray-900 font-bold ">
                  {asset.label}
                </h2>
              </div>
              <div className="container flex justify-center	">
                <img
                  className="transition duration-500 hover:scale-110 relative rounded overflow-hidden m-6 mb-8 w-60 h-75 rounded object-cover"
                  src={asset.src}
                  alt="title"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center mt-4"></div>
              <div className="text-center mt-4">
                <div>
                  <button
                    onClick={async () => {
                      if (isRecipeComplete) {
                        const hash = await forgeWeapon(assetsToBurn, asset);
                        if (hash) {
                          setShowModal(hash);
                        }
                      }
                    }}
                    className={`flex flex-col items-stretch w-1/2 bg-green-100 transition hover:bg-indigo-100 rounded-lg  mx-auto mb-1 ${
                      /* 
                      isRecipeComplete ? null : "cursor-not-allowed" */ "s"
                    }`}
                  >
                    <img src="/anvil.png" alt="title" />
                    <div className="font-display text-xl text-blueGray-900 font-bold">
                      Forge
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className=" basis-1/6 transition duration-500 hover:shadow-sm rounded p-5">
            <div className="container mx-auto relative px-4 z-10">
              <h2 className=" text-center font-display text-xl lg:text-4xl text-blueGray-900 font-bold mb-6">
                Recipe Ingredients
              </h2>
              <div className="grid grid-cols-4 gap-2 ">
                <div className="thumbnail grid gap-4 items-center grid-cols-2 col-span-7 md:col-span-4  h-200">
                  {asset.recipe.map(function (x, i) {
                    return Array.from(Array(x).keys()).map((y, w) => (
                      <div
                        className="flex justify-center	"
                        key={`${y}-img-container`}
                      >
                        <img
                          className="transition duration-500 hover:scale-110 relative rounded overflow-hidden m-2  rounded object-cover"
                          src={assets[i].src}
                          alt="title"
                          key={`${y}-img`}
                        />
                      </div>
                    ));
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export async function getStaticPaths() {
  // Return a list of possible value for id
  const paths = getAssetsPaths();

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  // Fetch necessary data for the blog post using params.id
  const postData = getPostData(params.id);
  return {
    props: {
      postData,
    },
  };
}
