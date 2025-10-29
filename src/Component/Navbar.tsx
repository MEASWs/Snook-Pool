import React from 'react'
const Navbar = () => {
    return (
        <div>
            <nav className=" px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">

            <div className="text-xl font-bold">สนุ๊กเกอร์ & พูล</div>
            

            <div className="hidden md:flex space-x-8">
                <a href="#" className="text-gray-300 hover:text-white">หน้าแรก</a>
                <a href="#" className="text-white hover:text-white">จองคิว สนุ๊กเกอร์ / พูล</a>
                <a href="#" className="text-gray-300 hover:text-white">เติมเงิน</a>
                <a href="/history" className="text-gray-300 hover:text-white">ประวัติการเล่น</a>
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="flex items-center bg-yellow-600 px-3 py-1 rounded-full">
                    <span className="text-yellow-300 text-sm mr-1">💰</span>
                    <span className="text-white text-sm font-medium">1,250</span>
                </div>
                <div className="relative">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                        <span className="text-gray-700 text-sm">👤</span>
                    </div>
                </div>
            </div>
        </div>
        <br />
        <hr />
    </nav>
        </div>
    )
}

export default Navbar
