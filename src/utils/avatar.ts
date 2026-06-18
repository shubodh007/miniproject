export const getAvatarGradient = (name: string): [string, string] => {
  const GRADIENTS = [
    ['#E47A22', '#F59E0B'],  // Saffron-amber
    ['#3B82F6', '#6366F1'],  // Blue-indigo
    ['#10B981', '#06B6D4'],  // Emerald-cyan
    ['#F43F5E', '#EC4899'],  // Rose-pink
    ['#8B5CF6', '#7C3AED'],  // Violet-purple
    ['#F97316', '#EF4444'],  // Orange-red
    ['#0EA5E9', '#2563EB'],  // Sky-blue
    ['#84CC16', '#22C55E'],  // Lime-green
  ];
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length;
  return GRADIENTS[idx] as [string, string];
};

export const getInitials = (name: string): string => {
  if (!name) return 'SC';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};
