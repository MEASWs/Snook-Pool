import ReserveCore from "../_components/ReserveCore";

export default function PoolReservePage() {
    return (
        <ReserveCore
            tableType="POOL"
            backHref="/booking/Pool"
            successPath="/reservationlist"
            typeIcon="🎯"
        />
    );
}