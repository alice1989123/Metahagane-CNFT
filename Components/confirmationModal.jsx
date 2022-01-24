import  { useState } from "react";
import {BsBagCheck} from 'react-icons/bs';

{/* <button>
  <BsGrid3X3GapFill />
</button>; */}


export default function ConfirmationModal({showModal , setShowModal,  title , description } ) {

	


	
 
   return (    
        <>
         {showModal &&  <div className={ ` flex flex-col space-y-4 min-w-screen h-screen animated fadeIn faster  fixed  left-0 top-0 flex justify-center items-center inset-0 z-50 outline-none focus:outline-none bg-gray-900  `}>
<div className="flex flex-col p-8 bg-white shadow-md hover:shodow-lg rounded-2xl">
	<div className={'flex flex-row items-center  '} >
<div className=" flex w-14 h-14 rounded-2xl p-3 border border-blue-100 text-blue-400 bg-blue-50" fill="none"
				viewBox="0 0 24 24" stroke="currentColor">
			<BsBagCheck color="blue" size={'30'}/> 
			
		</div>
		<div className=" mx-2 font-medium  text-lg leading-none">{title}</div>
		</div>

	<div className="flex items-center justify-between">
	
		<div className="flex items-center ">
       
		
			<div className="flex flex-col ml-3">
				<p  className="text-sm text-gray-600 leading-none m-2">{`Your transaction has been submited with the following transaction hash`}
				</p>
				<p className='m-2'>
					{`${showModal}`}
				</p>
			</div>
		</div>
	</div>
	<div className="flex flex-row-reverse	 mt-6">	<button  onClick={() =>setShowModal(false)} className="  flex-no-shrink text-white text-center font-body font-medium rounded py-2 px-4 transition-all duration-500 bg-gradient-to-tl from-indigo-500 via-purple-500 to-indigo-500 bg-size-200 bg-pos-0 hover:bg-pos-100">Go Back</button>
</div>

</div>

</div>}
        </>
  );
}