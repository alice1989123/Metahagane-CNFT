import { useState } from "react";
import { INFURA } from "../constants/routes";
import { getNiceName, HextoAscii, addressBech32 } from "../Cardano/Utils";
import React from "react";
import { CancelSell } from "../Cardano/Wallet";
import ConfirmationModal from "./confirmationModal";

export default function CancelModal({ showModal, setShowModal, address }) {
  const [showModal_, setShowModal_] = useState(false);
  return (
    <>
      <ConfirmationModal showModal={showModal_} setShowModal={setShowModal_} />
      {showModal && (
        <>
          <div
            className={` flex flex-col space-y-4 min-w-screen h-screen animated fadeIn faster  fixed  left-0 top-0 flex justify-center items-center inset-0 z-50 outline-none focus:outline-none bg-gray-100 opacity: 0.1  `}
          >
            <div className="  max-w-5xl				flex flex-col p-8 bg-white shadow-md hover:shodow-lg rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center ">
                  <div className="flex flex-row m-2 justify-evenly">
                    <div className="flex flex-col w-1/4 ">
                      <img
                        className="sm:h-90 rounded object-cover mr-2"
                        src={
                          showModal.aditionalInfo.onchain_metadata.image &&
                          `${INFURA}${showModal.aditionalInfo.onchain_metadata.image.replace(
                            "ipfs://",
                            "ipfs/"
                          )}`
                        }
                        alt="title"
                      />
                    </div>

                    <div>
                      <div
                        className={"grid grid-cols-4 gap-2 , text-center m-2"}
                      >
                        <div className={"col-span-5	m-4 text-4xl"}>
                          {" "}
                          {getNiceName(
                            HextoAscii(showModal.aditionalInfo.asset_name)
                          )}{" "}
                        </div>
                        <div className={"text-xl col-span-1  	"}>
                          {" "}
                          {"Asset"}{" "}
                        </div>

                        <div
                          className={
                            "text-sm col-span-4 text-ellipsis overflow-hidden   "
                          }
                        >
                          {" "}
                          {showModal.aditionalInfo.asset}{" "}
                        </div>

                        <div className={"text-xl col-span-1 "}>
                          {" "}
                          {"Policy Id"}{" "}
                        </div>

                        <div className={"text-md col-span-4"}>
                          {" "}
                          {showModal.aditionalInfo.policy_id}{" "}
                        </div>
                        <div className={"text-xl col-span-1 "}>
                          {" "}
                          {"Asset Name"}{" "}
                        </div>

                        <div className={"text-md col-span-4"}>
                          {" "}
                          {showModal.aditionalInfo.asset_name}{" "}
                        </div>
                        <div className={"text-xl col-span-1 "}>
                          {" "}
                          {"Finger Print"}{" "}
                        </div>

                        <div className={"text-md col-span-4"}>
                          {" "}
                          {showModal.aditionalInfo.fingerprint}{" "}
                        </div>
                        <div className={"text-xl col-span-1 "}>
                          {" "}
                          {"Quantity"}{" "}
                        </div>

                        <div className={"text-md col-span-4"}>
                          {" "}
                          {showModal.aditionalInfo.quantity}{" "}
                        </div>
                        <div className={"text-xl col-span-1 "}>
                          {" "}
                          {"Mint / Burn count"}{" "}
                        </div>

                        <div className={"text-md col-span-4"}>
                          {" "}
                          {showModal.aditionalInfo.mint_or_burn_count}{" "}
                        </div>
                        <div className={"text-xl col-span-1 "}> {"Price"} </div>

                        <div className={"text-md col-span-4"}>
                          {" "}
                          {showModal.price.price}
                          {" ADA "}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center	     m-2">
                <div className="   flex justify-between m-2 ">
                  <button
                    className="  text-white text-center font-body font-medium rounded h-12 py-2 px-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100"
                    onClick={async () => {
                      console.log(showModal);
                      const sellingData = {
                        unit: showModal.unit,
                        quantity: showModal.quantity,
                        price: showModal.price.price,
                      };

                      const hash = await CancelSell(sellingData);
                      if (hash) {
                        setShowModal_(hash);
                        setShowModal(false);
                      }
                    }}
                  >
                    {" "}
                    Cancel Sale{" "}
                  </button>
                </div>
                <div className="flex flex-col justify-end m-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="  text-white text-center font-body font-medium rounded h-12 py-2 px-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
