import ReserveCore from "../_components/ReserveCore";

export default function SnookReservePage() {
    return (
        <ReserveCore
            tableType="SNOOKER"
            backHref="/booking/Snook"
            successPath="/reservationlist"
            typeIcon="🎱"
        />
    );
}
