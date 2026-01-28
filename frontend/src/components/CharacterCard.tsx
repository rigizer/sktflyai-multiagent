import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Character } from '../types/character';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  onToggle: (id: number) => void | Promise<void>;
  disabled: boolean;
}

export function CharacterCard({ character, isSelected, onToggle, disabled }: CharacterCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`relative glass rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isSelected ? 'ring-2 ring-offset-2 ring-offset-[#0a0e27]' : ''
      } ${disabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{
        ringColor: isSelected ? character.color : 'transparent',
      }}
      onClick={() => !disabled && onToggle(character.id)}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-b from-transparent to-black/40">
        <ImageWithFallback
          src={character.image}
          alt={character.name}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Selected Badge */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: character.color }}
          >
            <Check className="w-5 h-5 text-white" />
          </motion.div>
        )}
        
        {/* Character Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white mb-1">{character.name}</h3>
          <p className="text-sm text-gray-300 opacity-90">{character.series}</p>
        </div>
      </div>
      
      {/* Shine Effect on Hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
        whileHover={{ translateX: '200%' }}
        transition={{ duration: 0.6 }}
        style={{ pointerEvents: 'none' }}
      />
    </motion.div>
  );
}
