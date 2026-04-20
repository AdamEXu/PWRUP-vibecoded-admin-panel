export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <p className="font-['SF_Pro',sans-serif] text-[48px] text-white text-center">
        {title} is coming soon™
      </p>
    </div>
  );
}
