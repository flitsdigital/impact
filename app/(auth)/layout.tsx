import Image from "next/image"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-bg-0">
      {/* Decoratief bliksem-watermerk */}
      <svg
        aria-hidden
        viewBox="0 0 1572 1909"
        preserveAspectRatio="none"
        className="pointer-events-none absolute left-[calc(50%-572px)] top-[calc(50%+0.5px)] h-[1909px] w-[1572px] -translate-x-1/2 -translate-y-1/2"
      >
        <path
          d="M1197.25 13.7328C1229.18 34.7853 1242.86 74.4341 1230.93 110.574L1024.61 729.868H1448.84C1516.91 729.868 1572 784.955 1572 853.025C1572 888.112 1557.26 921.445 1530.95 944.603L477.214 1887.4C448.792 1913.02 406.685 1916.17 374.754 1895.12C342.822 1874.07 329.137 1834.42 341.068 1798.28L547.393 1178.99H123.163C55.0902 1178.99 0 1123.9 0 1055.83C0 1021.09 14.7375 987.761 41.0545 964.252L1094.79 21.4521C1123.21 -4.16178 1165.32 -6.96878 1197.25 13.7328ZM241.765 1010.57H664.24C691.259 1010.57 716.874 1023.55 732.664 1045.66C748.454 1067.76 752.665 1095.83 744.244 1121.44L601.079 1550.56L1330.23 898.288H907.76C880.741 898.288 855.126 885.305 839.336 863.2C823.546 841.095 819.335 813.025 827.756 787.411L970.921 358.292L241.765 1010.57Z"
          fill="white"
          fillOpacity="0.01"
        />
      </svg>

      {/* ─── Links — formulier ─── */}
      <div className="relative z-10 flex w-full flex-col justify-center px-6 py-10 md:px-[96px] lg:w-1/2">
        <div className="flex w-full max-w-[528px] flex-col gap-6">{children}</div>
      </div>

      {/* ─── Rechts — sfeerbeeld ─── */}
      <div className="relative hidden py-[22px] pr-[17px] lg:block lg:w-1/2">
        <div className="relative h-full w-full overflow-hidden rounded-[16px]">
          <Image
            src="/login/hero.png"
            alt="Twee collega's werken samen achter een laptop"
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  )
}
