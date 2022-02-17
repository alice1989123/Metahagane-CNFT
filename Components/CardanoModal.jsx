import { useState } from "react";
import { INFURA } from "../constants/routes";
import { addressBech32 } from "../Cardano/Utils";
import React, { Fragment } from "react";
import { useForm } from "react-hook-form";
import { sell } from "../Cardano/Wallet";
import { getAssets, registerSell } from "../pages/api/server";
import ConfirmationModal from "./confirmationModal";
import Link from "next/link";

export default function CardanoModal({ showModal, setShowModal, address }) {
  const [showModal_, setShowModal_] = useState(false);
  return (
    <>
      <ConfirmationModal showModal={showModal_} setShowModal={setShowModal_} />
      {showModal && (
        <>
          <div
            data-aos="fade-up"
            className={` flex flex-col space-y-4 min-w-screen h-screen animated fadeIn faster  fixed  left-0 top-0 flex justify-center items-center inset-0 z-50 outline-none focus:outline-none bg-gray-100 opacity: 0.1  `}
          >
            <div className="  max-w-5xl				flex flex-col p-8 bg-white shadow-md hover:shodow-lg rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex  flex-col items-center  ">
                  <h2 className=" text-base text-xl text-blueGray-600 font-semibold m-2 ">
                    There is no Cardano Wallet enabled
                  </h2>
                  <p className="max-w-md m-4	">
                    {" "}
                    In order to interact with the Cardano Block Chain you must
                    connect your wallet to the App
                  </p>
                  <button
                    onClick={async () => {
                      const isCardano = await window.cardano;
                      //console.log(isCardano);
                      if (isCardano) {
                        await window.cardano.enable();
                      } else {
                        window.open("https://namiwallet.io/", "_blank");
                      }
                    }}
                    className="btn xl:flex items-center text-white font-body font-semibold rounded h-14 p-8 my-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100"
                  >
                    <img
                      className="w-4 h-4 flex-shrink-0  mr-2"
                      src="/wallet-icon.svg"
                      title="title"
                    />
                    Connect Wallet
                  </button>
                  <div className="w-full flex justify-end">
                    <Link href="/">
                      <a className="  text-white text-center font-body font-medium rounded h-12  pt-2 pb-2 h-10 px-4  transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100">
                        Go Back
                      </a>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const HookForm = ({ showModal, setShowModal, address, setShowModal_ }) => {
  const { register, errors, handleSubmit } = useForm();

  const onSubmit = async (price) => {
    const address = await addressBech32();
    if (address) {
      const sellingData = {
        unit: showModal.asset,
        quantity: showModal.quantity,
      };
      //console.log(showModal);
      //console.log(price.price);

      const hash = await sell(sellingData, price.price * 1000000);
      if (hash) {
        registerSell(showModal.asset, price, address);
        setShowModal_(hash);
        setShowModal(false);
      }
    }
  };

  return (
    <Fragment>
      <h2>Listing Price</h2>
      <form className="flex" onSubmit={handleSubmit(onSubmit)}>
        <input
          placeholder="Select a price for sale"
          className="form-control m-2"
          name="usuario"
          {...register("price", {
            required: true,
            message: "price is required",
          })}
        ></input>
        <button
          type="submit"
          className={
            " m-2 flex-no-shrink text-white text-center font-body font-medium rounded py-2 px-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100"
          }
        >
          <img
            className="w-4 h-4 inline-block mb-1"
            src="assets/images/bid-icon2.svg"
            alt="title"
          />
          Sell Item
        </button>
      </form>
    </Fragment>
  );
};
