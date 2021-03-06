import { useState, useEffect } from "react";
import axios from "axios";
import { selector } from "../constants/selector";
import { INFURA } from "../constants/routes";
import { Footer } from "../Components/footer";
import {
  HextoAscii,
  addressBech32,
  fromHex,
  loadCardano,
} from "../Cardano/Utils";
import BuyModal from "../Components/BuyModal";
import { getNiceName } from "../Cardano/Utils";
import { marketScriptAdresssBech32 } from "../constants/marketPLaceAddress";
import { martketData } from "./api/server";
import CancelModal from "../Components/CancelModal";
import BuyModal_ from "../Components/BuyModal_";
import CardanoModal from "../Components/CardanoModal";

const server = process.env.NEXT_PUBLIC_SERVER_API;

export default function MarketPLace({
  selectedAsset,
  setselectedAsset,
  isInventory,
  isRecipeComplete,
}) {
  const [selectedNFTs, setSelectedNFTs] = useState([]);
  const [NFTs, setNFTs] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");
  const [assetToSell, setAssetToSell] = useState(null);
  const [assetToBuy, setAssetToBuy] = useState(null);
  const [address, setAddress] = useState(null);
  const [filterOption, setFilterOption] = useState("all");
  const [myAssets, setmyAssets] = useState(false);
  const [isCardano, setIsCardano] = useState(true);

  useEffect(async () => {
    await loadCardano(setIsCardano);
    await loadNFTs();
  }, []);

  useEffect(() => {
    loadNFTs();
  }, [isCardano]);

  async function loadCardano() {
    const cardanoProvider = await window.cardano;
    if (cardanoProvider) {
      console.log("there is cardano provider");
      const enabled = await window.cardano.enable();
      if (enabled) {
        setIsCardano(true);
      }
    } else console.log("there is not cardano provider");
  }

  async function loadNFTs() {
    if (isCardano) {
      const address = await addressBech32();
      setAddress(address);

      const marketAddress = marketScriptAdresssBech32;

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
      //console.log(marketAddress);
      const marketData = await martketData(marketAddress);
      //console.log(marketData[0]);
      if (marketData.length == 0) {
        setLoadingState("loaded");
      } else {
        console.log(marketData);
        const data2 = await Promise.all(
          marketData.map(async (x) => {
            console.log(x.unit);
            const response = await axios.post(`${server}/api/assetss/info`, {
              asset: x.unit,
            });
            // console.log( )
            const aditionalInfo = response.data;

            x.aditionalInfo = aditionalInfo;
            //console.log(marketData);
            //console.log(response.data);
            return response;
          })
        );

        setNFTs(marketData);
        setSelectedNFTs(filterNFTs_(filterNFTs(NFTs)));

        setLoadingState("loaded");
      }
    }
  }

  function filterNFTs(NFTs_, filterOption_) {
    //filters according to type of NFT
    if (filterOption_ == "all") {
      return NFTs_;
    } else {
      return NFTs_.filter((x) => {
        console.log(
          selector(
            Buffer.from(x.unit.slice(56, 100), "hex")
              .toString("utf-8")
              .replace(/[0-9]/g, ""),
            filterOption_
          )
        );
        return (
          selector(
            Buffer.from(x.unit.slice(56, 100), "hex")
              .toString("utf-8")
              .replace(/[0-9]/g, "")
          ) == filterOption_ ||
          selector(
            Buffer.from(x.unit.slice(56, 100), "hex")
              .toString("utf-8")
              .replace(/[0-9]/g, "")
          )
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .split(" ")[1] == filterOption_
        );
      });
    }
  }

  function filterNFTs_(NFTs_, myAssets_) {
    if (myAssets_) {
      return NFTs_.filter((x) => x.address == address);
    }
    return NFTs_.filter((x) => x.address != address);
  }

  function ShowNFTs({ selectedNFTs, myAssets }) {
    const NFTWrapper = function ({ nft, setAssetToSell, myAssets }) {
      return (
        <>
          {/*  <div>{JSON.stringify(nft)}</div> */}
          <div
            className="product-box gradient-box flex justify-between flex-col bg-white shadow rounded transition hover:shadow-lg"
            data-aos="fade-up"
          >
            <div className="product-top relative bg-white">
              <div className="product-image relative rounded overflow-hidden m-6 mb-8">
                <img
                  className="w-full sm:h-90 rounded object-cover"
                  src={
                    nft.aditionalInfo.onchain_metadata.image &&
                    `${INFURA}${nft.aditionalInfo.onchain_metadata.image.replace(
                      "ipfs://",
                      "ipfs/"
                    )}`
                  }
                  alt="title"
                />
              </div>
              <button
                onClick={() => {
                  myAssets ? setAssetToSell(nft) : setAssetToBuy(nft);
                }}
                className="product-meta absolute left-0 right-0 m-auto bottom-24 w-36 block text-white text-center font-body font-medium rounded py-2 px-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100"
              >
                <img
                  className="w-4 h-4 inline-block mb-1"
                  src="assets/images/bid-icon2.svg"
                  alt="title"
                />
                {`${myAssets ? "Cancel Sale" : "Buy Item"}`}{" "}
              </button>
              <div className="product-content px-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <a
                      href="creator-published.html"
                      className="relative"
                      data-tooltip="Steven Robart"
                    >
                      <img
                        className="border-2 border-white w-10 h-10 object-cover rounded-lg"
                        src="assets/images/author/1.jpg"
                        alt="title"
                      />
                    </a>
                    <a
                      href="creator-published.html"
                      className="relative -left-2"
                      data-tooltip="Steven Robart"
                    >
                      <img
                        className="border-2 border-white w-10 h-10 object-cover rounded-lg"
                        src="assets/images/author/3.jpg"
                        alt="title"
                      />
                    </a>
                    <a
                      href="creator-published.html"
                      className="relative -left-4"
                      data-tooltip="Steven Robart"
                    >
                      <img
                        className="border-2 border-white w-10 h-10 object-cover rounded-lg"
                        src="assets/images/author/3.jpg"
                        alt="title"
                      />{" "}
                      <span className="absolute bottom-0 right-1">
                        <img
                          className="w-3 h-3"
                          src="assets/images/verified-icon.svg"
                          alt="title"
                        />
                      </span>
                    </a>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-indigo-100 flex items-center justify-center rounded-lg w-8 h-8">
                      <img src="assets/images/heart-icon2.svg" alt="title" />
                    </span>
                    <p className="font-body font-bold text-sm text-blueGray-600 ml-2">
                      90 Likes
                    </p>
                  </div>
                </div>
                <h3 className="text-center font-display text-xl text-blueGray-900 font-bold transition hover:text-indigo-500">
                  <a href="item-single.html">
                    {" "}
                    {getNiceName(
                      HextoAscii(nft.aditionalInfo.asset_name).split(/[0-9]/)[0]
                    )}
                    {!Buffer.from(nft.aditionalInfo.asset_name, "hex")
                      .toString("utf-8")
                      .match(/\d/g)
                      ? null
                      : ` #${Buffer.from(nft.aditionalInfo.asset_name, "hex")
                          .toString("utf-8")
                          .match(/\d/g)
                          .join("")}`}
                  </a>
                </h3>
              </div>
            </div>
            <div className="product-bottom bg-white flex items-center flex-wrap justify-between pt-4 px-6 pb-6">
              <div>
                <p className="font-body text-sm text-blueGray-600">Price</p>
              </div>
              <div className="text-center">
                <p className="flex items-center font-body font-bold text-blueGray-900 my-1">
                  <img
                    className="w-5 h-5 inline-block mr-1"
                    src="assets/images/Cardano.png"
                    alt="title"
                  />{" "}
                  {nft.price.price} ADA
                </p>
                <p className="font-body text-sm text-blueGray-600">???$26.69</p>
              </div>
            </div>
          </div>
        </>
      );
    };

    return (
      <>
        <div className="product-infinite grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {selectedNFTs.map((NFT, i) => (
            <NFTWrapper
              nft={NFT}
              myAssets={myAssets}
              key={i}
              setAssetToSell={setAssetToSell}
              setAssetToBuy={setAssetToBuy}
            ></NFTWrapper>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {" "}
      {/* <div>{JSON.stringify(NFTs)}</div> */}
      <CardanoModal showModal={!isCardano} />
      <BuyModal_ showModal={assetToBuy} setShowModal={setAssetToBuy} />
      <CancelModal showModal={assetToSell} setShowModal={setAssetToSell} />
      <section className="hero-section relative mt-2 pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="container mx-auto relative px-4 z-10">
          <div className={"flex justify-between"}>
            <div>
              <h2 className="font-display text-4xl lg:text-6xl text-blueGray-900 font-bold mb-4">
                Market Place
              </h2>
              <ul className="hero-breadcrumb font-body text-blueGray-600 flex flex-wrap items-center">
                <li className="flex items-center mr-2">
                  <a
                    className="transition duration-500  hover:text-indigo-500 underline-hover"
                    href="index.html"
                  >
                    Home
                  </a>
                </li>
                <li className="flex items-center mr-2">
                  <img
                    className="w-3 h-3 inline-block mr-2"
                    src="assets/images/right-arrow.svg"
                    alt="title"
                  />
                  <a
                    className="transition duration-500  hover:text-indigo-500 underline-hover"
                    href="explore.html"
                  >
                    {" "}
                    Inventory
                  </a>
                </li>
                <li className="flex items-center text-indigo-500 mr-2">
                  <img
                    className="w-3 h-3 inline-block mr-2"
                    src="assets/images/right-arrow.svg"
                    alt="title"
                  />{" "}
                  Explore
                </li>
              </ul>
            </div>
            <div className={"flex justify-end items-center"}>
              <div className="flex justify-end items-center 	">
                <div className="flex justify-end items-center">
                  <a
                    onClick={() => {
                      setmyAssets(true);
                      setSelectedNFTs(
                        filterNFTs(filterNFTs_(NFTs, true), filterOption)
                      );
                    }}
                    className={selectedButton_(myAssets, true)}
                  >
                    My Assets on Sale
                  </a>
                  <a
                    onClick={() => {
                      setmyAssets(false);
                      setSelectedNFTs(
                        filterNFTs(filterNFTs_(NFTs, false), filterOption)
                      );
                    }}
                    className={selectedButton_(myAssets, false)}
                  >
                    Buy New Assets
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>{" "}
      <section className="product-section relative mb-20 lg:mb-32">
        <div className="container mx-auto relative px-4 z-10">
          <div className="flex justify-center   mb-8 lg:mb-14"></div>
          <div className="flex justify-between mb-8 lg:mb-14">
            <div className="flex items-center pr-6">
              <div className="hidden lg:flex flex-wrap items-center">
                <a
                  onClick={() => {
                    setFilterOption("all");
                    console.log(filterNFTs_(NFTs, myAssets));
                    console.log(filterNFTs(filterNFTs_(NFTs, myAssets), "all"));
                    setSelectedNFTs(
                      filterNFTs(filterNFTs_(NFTs, myAssets), "all")
                    );
                  }}
                  className={selectedButton(filterOption, "all")}
                >
                  All
                </a>
                <a
                  onClick={() => {
                    setFilterOption("rawMaterial");
                    setSelectedNFTs(
                      filterNFTs(filterNFTs_(NFTs, myAssets), "rawMaterial")
                    );
                  }}
                  className={selectedButton(filterOption, "rawMaterial")}
                >
                  Raw Materials
                </a>
                <a
                  onClick={() => {
                    setFilterOption("materialIngot");
                    setSelectedNFTs(
                      filterNFTs(filterNFTs_(NFTs, myAssets), "materialIngot")
                    );
                  }}
                  className={selectedButton(filterOption, "materialIngot")}
                >
                  Ingots
                </a>
                <a
                  onClick={() => {
                    setFilterOption("tool");
                    setSelectedNFTs(
                      filterNFTs(filterNFTs_(NFTs, myAssets), "tool")
                    );
                  }}
                  className={selectedButton(filterOption, "tool")}
                >
                  Tools
                </a>
                <a
                  onClick={() => {
                    setFilterOption("Weapon");
                    setSelectedNFTs(
                      filterNFTs(filterNFTs_(NFTs, myAssets), "Weapon")
                    );
                  }}
                  className={selectedButton(filterOption, "Weapon")}
                >
                  Weapons
                </a>
              </div>
            </div>
          </div>
          <ShowNFTs selectedNFTs={selectedNFTs} myAssets={myAssets} />
          <div className="flex justify-center mt-8 lg:mt-14">
            <button className="btn load-more-btn flex items-center text-white font-body font-bold rounded px-6 py-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100">
              Load More{" "}
              <img
                className="w-4 h-4 flex-shrink-0 animate-spin ml-2"
                src="assets/images/spinner-icon.svg"
                alt="title"
              />
            </button>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

const selected =
  "btn inline-block text-white font-body font-bold rounded py-3 px-6 mr-4 mb-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100";
const notSelected =
  "block border border-blueGray-300 text-blueGray-900 hover:text-white font-body font-bold rounded py-3 px-6 mr-4 mb-4 transition duration-500 hover:bg-indigo-500 hover:border-indigo-500";

function selectedButton(selectedOption, selector) {
  if (selectedOption == selector) {
    return selected;
  } else {
    return notSelected;
  }
}

const classIsMine =
  "btn inline-block text-white font-body font-bold rounded py-5 px-6  ml-4 mb-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100";

const classIsnotMine =
  "block border border-blueGray-300 text-blueGray-900 hover:text-white ml-4 font-body font-bold rounded py-5 px-6  mb-4 transition duration-500 hover:bg-indigo-500 hover:border-indigo-500";

function selectedButton_(selectedOption, selector) {
  if (selectedOption == selector) {
    return classIsMine;
  } else {
    return classIsnotMine;
  }
}
