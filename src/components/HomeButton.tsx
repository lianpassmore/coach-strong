import Image from "next/image";
import Link from "next/link";

export default function HomeButton() {
  return (
    <Link href="/dashboard" className="opacity-80 hover:opacity-100 transition-opacity active:scale-95">
      <Image
        src="/Logo_square_OG.png"
        alt="Back to Dashboard"
        width={36}
        height={36}
        className="brightness-0 invert"
      />
    </Link>
  );
}
