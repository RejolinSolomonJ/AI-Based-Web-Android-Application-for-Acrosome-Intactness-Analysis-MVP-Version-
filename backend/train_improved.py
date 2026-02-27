"""
Improved training script optimized for small, imbalanced datasets.
Uses aggressive augmentation, K-fold cross-validation concepts,
and a simpler fine-tuning strategy.
"""

import os
import sys
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from sklearn.utils.class_weight import compute_class_weight

# ── Configuration ────────────────────────────────────────────────────────────
DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml_models")
MODEL_PATH = os.path.join(MODEL_DIR, "acrosome_cnn_model.h5")
IMAGE_SIZE = (224, 224)
BATCH_SIZE = 8          # Smaller batch for small dataset
EPOCHS = 50
LEARNING_RATE = 5e-5    # Lower LR for fine-tuning
VAL_SPLIT = 0.15        # Smaller validation split to keep more training data

os.makedirs(MODEL_DIR, exist_ok=True)


def create_generators():
    """Create heavily augmented data generators for small dataset."""

    # Aggressive augmentation to maximize small dataset
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        rotation_range=360,
        horizontal_flip=True,
        vertical_flip=True,
        width_shift_range=0.2,
        height_shift_range=0.2,
        zoom_range=0.3,
        brightness_range=[0.7, 1.3],
        shear_range=0.15,
        channel_shift_range=20,
        fill_mode="reflect",
        validation_split=VAL_SPLIT,
    )

    val_datagen = ImageDataGenerator(
        rescale=1.0 / 255.0,
        validation_split=VAL_SPLIT,
    )

    train_gen = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        subset="training",
        shuffle=True,
        seed=42,
        classes=["damaged", "intact"],
    )

    val_gen = val_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        subset="validation",
        shuffle=False,
        seed=42,
        classes=["damaged", "intact"],
    )

    return train_gen, val_gen


def build_model():
    """
    Build MobileNetV2 with a 2-phase fine-tuning strategy:
    Phase 1: Freeze all MobileNet layers, train only the head
    Phase 2: Unfreeze last 20 layers and fine-tune with very low LR
    """
    base_model = MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights="imagenet",
    )

    # Phase 1: FREEZE the entire backbone
    base_model.trainable = False

    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.BatchNormalization(),
        layers.Dropout(0.4),
        layers.Dense(64, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(0.01)),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(1, activation="sigmoid"),
    ], name="AcrosomeMobileNet")

    model.compile(
        optimizer=optimizers.Adam(learning_rate=1e-3),  # Higher LR for phase 1
        loss="binary_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.Precision(name="precision"),
            tf.keras.metrics.Recall(name="recall"),
            tf.keras.metrics.AUC(name="auc"),
        ],
    )

    return model, base_model


def train():
    print("=" * 60)
    print("ACROSOME INTACTNESS MODEL - IMPROVED TRAINING")
    print("=" * 60)
    print(f"  Dataset     : {DATASET_DIR}")
    print(f"  Image size  : {IMAGE_SIZE}")
    print(f"  Batch size  : {BATCH_SIZE}")
    print(f"  Epochs      : {EPOCHS} (Phase 1: 15 + Phase 2: 35)")
    print(f"  Output      : {MODEL_PATH}")
    print("=" * 60)

    # ── Load data ────────────────────────────────────────────────
    print("\n[1/5] Loading dataset...")
    train_gen, val_gen = create_generators()
    print(f"  Training   : {train_gen.samples} images")
    print(f"  Validation : {val_gen.samples} images")
    print(f"  Classes    : {train_gen.class_indices}")

    # ── Compute class weights ────────────────────────────────────
    classes = train_gen.classes
    unique = np.unique(classes)
    weights = compute_class_weight("balanced", classes=unique, y=classes)
    class_weights = dict(zip(unique, weights))
    print(f"  Weights    : {class_weights}")

    # ── Build model ──────────────────────────────────────────────
    print("\n[2/5] Building MobileNetV2 model...")
    model, base_model = build_model()

    trainable = sum(1 for l in model.layers if l.trainable)
    total_params = model.count_params()
    print(f"  Total params     : {total_params:,}")
    print(f"  Trainable layers : {trainable}")

    # ── Phase 1: Train head only (backbone frozen) ───────────────
    print("\n[3/5] Phase 1: Training classification head (backbone frozen)...")

    phase1_callbacks = [
        EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-6, verbose=1),
    ]

    steps_per_epoch = max(train_gen.samples // BATCH_SIZE, 1)
    val_steps = max(val_gen.samples // BATCH_SIZE, 1)

    h1 = model.fit(
        train_gen,
        steps_per_epoch=steps_per_epoch,
        validation_data=val_gen,
        validation_steps=val_steps,
        epochs=15,
        class_weight=class_weights,
        callbacks=phase1_callbacks,
        verbose=1,
    )

    phase1_val_acc = max(h1.history.get("val_accuracy", [0]))
    print(f"\n  Phase 1 best val_accuracy: {phase1_val_acc:.4f}")

    # ── Phase 2: Fine-tune last layers of backbone ───────────────
    print("\n[4/5] Phase 2: Fine-tuning last 20 backbone layers...")

    base_model.trainable = True
    # Freeze all but last 20 layers
    for layer in base_model.layers[:-20]:
        layer.trainable = False

    # Recompile with much lower LR for fine-tuning
    model.compile(
        optimizer=optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="binary_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.Precision(name="precision"),
            tf.keras.metrics.Recall(name="recall"),
            tf.keras.metrics.AUC(name="auc"),
        ],
    )

    phase2_callbacks = [
        ModelCheckpoint(
            filepath=MODEL_PATH,
            monitor="val_accuracy",
            mode="max",
            save_best_only=True,
            verbose=1,
        ),
        EarlyStopping(monitor="val_loss", patience=12, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=4, min_lr=1e-7, verbose=1),
    ]

    # Reset generators
    train_gen.reset()
    val_gen.reset()

    h2 = model.fit(
        train_gen,
        steps_per_epoch=steps_per_epoch,
        validation_data=val_gen,
        validation_steps=val_steps,
        epochs=35,
        class_weight=class_weights,
        callbacks=phase2_callbacks,
        verbose=1,
    )

    # ── Evaluate ─────────────────────────────────────────────────
    print("\n[5/5] Final Evaluation:")
    val_gen.reset()
    results = model.evaluate(val_gen, verbose=0)
    metrics = dict(zip(model.metrics_names, results))

    for name, value in metrics.items():
        print(f"  {name:>12s}: {value:.4f}")

    # Save final model
    model.save(MODEL_PATH)
    print(f"\n[SAVE] Model saved to: {MODEL_PATH}")

    # Also save as SavedModel format
    savedmodel_path = MODEL_PATH.replace(".h5", "_savedmodel")
    model.save(savedmodel_path)
    print(f"[SAVE] SavedModel saved to: {savedmodel_path}")

    print("\n" + "=" * 60)
    print("TRAINING COMPLETE!")
    print("=" * 60)

    return metrics


if __name__ == "__main__":
    train()
