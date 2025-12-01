import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplier_id, instruction } = body;

    if (!supplier_id || !instruction) {
      return NextResponse.json(
        {
          success: false,
          error: 'supplier_id and instruction are required',
        },
        { status: 400 }
      );
    }

    // Mock NLP processing - in a real implementation, this would call an AI service
    // For now, return a basic rule configuration based on common patterns
    let ruleConfig = {};

    // Simple pattern matching for common rule types
    const instructionLower = instruction.toLowerCase();

    if (instructionLower.includes('join') || instructionLower.includes('merge')) {
      ruleConfig = {
        operation: 'join',
        type: 'data_transformation',
        description: 'Join datasets based on specified columns',
        parameters: {
          join_type: 'inner',
          join_columns: ['Product Title', 'Description'],
        },
      };
    } else if (instructionLower.includes('validate') || instructionLower.includes('check')) {
      ruleConfig = {
        operation: 'validate',
        type: 'data_validation',
        description: 'Validate data against specified criteria',
        parameters: {
          validation_type: 'required_fields',
          required_columns: ['SKU', 'Price'],
        },
      };
    } else if (instructionLower.includes('map') || instructionLower.includes('transform')) {
      ruleConfig = {
        operation: 'map',
        type: 'data_transformation',
        description: 'Map columns to new names or values',
        parameters: {
          mappings: {
            'Part#': 'SKU',
            'NETT EXCL': 'priceExVat',
            Materials: 'category',
          },
        },
      };
    } else {
      // Default transformation rule
      ruleConfig = {
        operation: 'transform',
        type: 'data_transformation',
        description: instruction,
        parameters: {
          transformation_steps: [],
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: ruleConfig,
      message: 'Rule configuration generated successfully',
    });
  } catch (error: any) {
    console.error('NLP rule generation API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to generate rule configuration',
      },
      { status: 500 }
    );
  }
}
