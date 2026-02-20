// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      {/* Lovable-style gradient background */}
      <div className="absolute inset-0 bg-[image:var(--gradient-primary)] opacity-80" />
      <div className="absolute inset-0 bg-background/30 backdrop-blur-3xl" />
      <div className="text-center relative z-10">
        <h1 className="mb-4 text-4xl font-bold gradient-text-animated">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
